package expo.modules.tvlink

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.HttpURLConnection
import java.net.InetAddress
import java.net.NetworkInterface
import java.net.Socket
import javax.net.SocketFactory
import java.net.URL
import java.security.SecureRandom
import java.security.cert.X509Certificate
import java.util.concurrent.Callable
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

// Conexões sem espera: manda cada tecla na hora, sem juntar pacotes pequenos (Nagle).
private class NoDelayFactory : SocketFactory() {
  private val base: SocketFactory = SocketFactory.getDefault()
  private fun <T : Socket> T.fast(): T { tcpNoDelay = true; keepAlive = true; return this }
  override fun createSocket(): Socket = base.createSocket().fast()
  override fun createSocket(host: String, port: Int): Socket = base.createSocket(host, port).fast()
  override fun createSocket(host: String, port: Int, localHost: InetAddress, localPort: Int): Socket = base.createSocket(host, port, localHost, localPort).fast()
  override fun createSocket(host: InetAddress, port: Int): Socket = base.createSocket(host, port).fast()
  override fun createSocket(address: InetAddress, port: Int, localAddress: InetAddress, localPort: Int): Socket = base.createSocket(address, port, localAddress, localPort).fast()
}

// Fala com a TV Samsung. A TV usa um certificado próprio (autoassinado), que o
// Android recusa por padrão. Aqui ele só é aceito para endereços da rede de casa.
class TvLinkModule : Module() {
  private var ws: WebSocket? = null
  private var gen = 0

  private val privateHost = Regex("^(10\\.|192\\.168\\.|172\\.(1[6-9]|2\\d|3[01])\\.)")

  private fun buildClient(): OkHttpClient {
    val tm = object : X509TrustManager {
      override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {}
      override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {}
      override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
    }
    val ctx = SSLContext.getInstance("TLS")
    ctx.init(null, arrayOf<TrustManager>(tm), SecureRandom())
    return OkHttpClient.Builder()
      .socketFactory(NoDelayFactory())
      .sslSocketFactory(ctx.socketFactory, tm)
      .hostnameVerifier { _, _ -> true }
      .connectTimeout(6, TimeUnit.SECONDS)
      .readTimeout(0, TimeUnit.MILLISECONDS)
      .pingInterval(20, TimeUnit.SECONDS)
      .build()
  }

  private fun localPrefix(): String? {
    val ifaces = NetworkInterface.getNetworkInterfaces() ?: return null
    for (ni in ifaces) {
      if (!ni.isUp || ni.isLoopback) continue
      for (addr in ni.inetAddresses) {
        val h = addr.hostAddress ?: continue
        if (addr is java.net.Inet4Address && privateHost.containsMatchIn(h)) {
          return h.substringBeforeLast('.')
        }
      }
    }
    return null
  }

  private fun probe(ip: String): Map<String, String>? {
    return try {
      val c = URL("http://$ip:8001/api/v2/").openConnection() as HttpURLConnection
      c.connectTimeout = 700
      c.readTimeout = 1500
      val body = c.inputStream.bufferedReader().use { it.readText() }
      c.disconnect()
      val j = JSONObject(body)
      val d = j.optJSONObject("device") ?: JSONObject()
      mapOf(
        "ip" to ip,
        "name" to (j.optString("name").ifEmpty { d.optString("name") }),
        "model" to d.optString("modelName"),
        "mac" to d.optString("wifiMac"),
        "power" to d.optString("PowerState")
      )
    } catch (e: Exception) {
      null
    }
  }

  override fun definition() = ModuleDefinition {
    Name("TvLink")

    Events("onOpen", "onMessage", "onClose", "onError")

    Function("connect") { url: String ->
      val host = Regex("^wss?://([^:/]+)").find(url)?.groupValues?.get(1) ?: ""
      if (!privateHost.containsMatchIn(host)) {
        sendEvent("onError", mapOf("message" to "Endereço fora da rede de casa"))
        return@Function
      }
      ws?.cancel()
      gen += 1
      val mine = gen
      ws = buildClient().newWebSocket(Request.Builder().url(url).build(), object : WebSocketListener() {
        override fun onOpen(webSocket: WebSocket, response: Response) {
          if (mine == gen) sendEvent("onOpen", mapOf<String, Any>())
        }
        override fun onMessage(webSocket: WebSocket, text: String) {
          if (mine == gen) sendEvent("onMessage", mapOf("data" to text))
        }
        override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
          if (mine == gen) sendEvent("onClose", mapOf("code" to code))
        }
        override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
          if (mine == gen) sendEvent("onError", mapOf("message" to (t.message ?: "falha")))
        }
      })
    }

    Function("send") { text: String ->
      ws?.send(text) ?: false
    }

    Function("close") {
      gen += 1
      ws?.close(1000, null)
      ws = null
    }

    // Procura TVs Samsung na rede: testa os 254 endereços da rede do celular.
    AsyncFunction("discover") {
      val prefix = localPrefix() ?: return@AsyncFunction emptyList<Map<String, String>>()
      val pool = Executors.newFixedThreadPool(64)
      try {
        val tasks = (1..254).map { n -> Callable { probe("$prefix.$n") } }
        pool.invokeAll(tasks, 12, TimeUnit.SECONDS)
          .mapNotNull { f -> try { if (f.isCancelled) null else f.get() } catch (e: Exception) { null } }
      } finally {
        pool.shutdownNow()
      }
    }

    // Pergunta à TV quem ela é e se está ligada (PowerState: "on" ou "standby").
    AsyncFunction("info") { ip: String ->
      if (!privateHost.containsMatchIn(ip)) null else probe(ip)
    }

    // Wake-on-LAN: acorda a TV se ela aceitar ser ligada pela rede.
    AsyncFunction("wake") { mac: String ->
      val hex = mac.replace(Regex("[^0-9A-Fa-f]"), "")
      if (hex.length != 12) return@AsyncFunction false
      val bytes = ByteArray(6) { i -> hex.substring(i * 2, i * 2 + 2).toInt(16).toByte() }
      val packet = ByteArray(6 + 16 * 6)
      for (i in 0 until 6) packet[i] = 0xFF.toByte()
      for (i in 0 until 16) System.arraycopy(bytes, 0, packet, 6 + i * 6, 6)
      val prefix = localPrefix()
      val targets = listOfNotNull("255.255.255.255", prefix?.let { "$it.255" })
      DatagramSocket().use { s ->
        s.broadcast = true
        for (t in targets) for (port in intArrayOf(9, 7)) {
          s.send(DatagramPacket(packet, packet.size, InetAddress.getByName(t), port))
        }
      }
      true
    }
  }
}
