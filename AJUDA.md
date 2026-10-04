# Controle TV — se algo não funcionar

O app fala com a TV pelo Wi-Fi de casa (celular e TV na **mesma rede**). Nada passa pela internet.

## Primeira conexão
1. Ligue a TV. Abra o app: ele procura TVs Samsung na rede e lista as que achar.
2. Toque na sua TV. A TV mostra um aviso **"Permitir"** na tela. Aceite com o controle original.
3. Pronto: o app guarda a permissão e reconecta sozinho nas próximas vezes.

## Problemas conhecidos (e o que fazer)

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Nenhuma TV encontrada | Celular em outra rede (ex.: Wi-Fi de visitantes, 5G) ou TV desligada | Mesma rede nos dois. Ou digite o IP da TV (Configurações › Geral › Rede › Status da rede) |
| "A TV recusou a conexão" ou o aviso nunca aparece | A TV bloqueia aparelhos novos | Na TV: Configurações › Geral › Gerenciador de dispositivos externos › Gerenciador de conexão de dispositivo › **Notificação de acesso** ligada. Apague o "Controle TV" da lista de aparelhos e tente de novo |
| Funcionava e parou de pedir/aceitar | A TV esqueceu a permissão (atualização, reinício de fábrica) | O app apaga a permissão velha sozinho e pede de novo |
| Teclado não digita nada | A TV só aceita texto quando há um campo de texto aberto | Abra a busca na TV primeiro, depois digite no app |
| Um app (ex.: Globoplay) não abre | A TV não devolveu a lista de apps ou o nome é diferente | Veja se o app está instalado na TV. Netflix, YouTube, Prime, Disney+, Spotify e Apple TV têm código reserva; os demais dependem da lista da TV |
| Ligar não funciona com a TV desligada | A TV desliga o Wi-Fi quando apagada | Na TV: Configurações › Geral › Rede › Configurações avançadas › **Ligar com dispositivo móvel** (nome varia). Sem isso, só o controle original liga |
| Conexão cai depois de um tempo parado | O Android suspende o Wi-Fi com a tela apagada | Ao abrir o app ele reconecta (aviso "Reconectando…") |
| Comandos atrasam ao segurar volume | A TV ignora muitos comandos por segundo | O app já limita a ~6 por segundo |

## Voz
Usa o reconhecimento de voz do Android (Google), em português. Precisa de internet no celular e da permissão de microfone.
Comandos que entende: "aumenta/diminui o volume", "silencia", "muda o canal", "volta", "início", "desliga a TV", "abre a Netflix" (e os outros apps), "procura por ___" (digita na TV).
