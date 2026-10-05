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
| Teclado não digita nada | A TV só aceita texto em caixas de texto comuns; YouTube, Netflix etc. desenham o próprio teclado | Caixa comum: abra a busca na TV e use Enviar. YouTube: deixe o destaque na letra A e use "Digitar no YouTube (setas)" |
| "Digitar no YouTube" saiu errado | O destaque não estava na letra A quando começou, ou você mexeu na TV durante | Apague a caixa, volte o destaque ao A e tente de novo. Não toque no controle da TV enquanto digita |
| Um app não abre | O app não está instalado na TV, ou o código dele é diferente na sua região | O app avisa "não está instalado na TV". Os apps abrem pelo endereço REST da TV (testado na QN90A, onde o canal antigo não funciona) |
| Cursor (ponteiro) na tela da TV | Testado na QN90A: a TV não mostra o ponteiro de forma confiável por esse canal | Recurso removido. Use o touchpad de setas |
| Ligar não funciona com a TV desligada | A TV desliga o Wi-Fi quando apagada | Na TV: Configurações › Geral › Rede › Configurações avançadas › **Ligar com dispositivo móvel** (nome varia). Sem isso, só o controle original liga |
| TV foi desligada com o app aberto | Normal | O app mostra "TV desligada ou fora do ar" e tenta reconectar sozinho a cada 5 segundos. Quando a TV ligar (pelo controle ou pelo botão do app), ele volta sozinho. Ao ir pro segundo plano ele para de tentar |
| Conexão cai depois de um tempo parado | O Android suspende o Wi-Fi com a tela apagada | Ao abrir o app ele reconecta (aviso "Reconectando…") |
| Comandos atrasam ao segurar volume | A TV ignora muitos comandos por segundo | O app já limita a ~6 por segundo |
| "Código não aceito" ao vincular o YouTube | O código só vale enquanto a tela dele está aberta na TV | Na TV: YouTube › Configurações › Vincular com código de TV, e digite os números logo |
| Vídeo não abre na TV | O YouTube da TV estava fechado, ou o vínculo foi desfeito | O app abre o YouTube e tenta de novo. Se continuar, toque em Desvincular e ligue de novo com um código novo |

## Atualizar o app
Config › Versão › Verificar. Quando houver versão nova aparece uma faixa laranja no topo: toque em Atualizar, espere baixar e confirme a instalação do Android. Precisa que o repositório do GitHub seja público.

## Buscar no YouTube
Toque em "Buscar no YouTube" (acima dos apps). Na primeira vez, ligue o app à TV com o código de TV do YouTube (uma vez só). Depois é buscar, tocar no vídeo e ele abre na TV. Essa busca é mais rápida que digitar na TV. Para digitar na própria TV, veja "Teclado do YouTube" abaixo.

## Voz
Usa o reconhecimento de voz do Android (Google), em português. Precisa de internet no celular e da permissão de microfone.
Comandos que entende: "aumenta/diminui o volume", "silencia", "muda o canal", "volta", "início", "desliga a TV", "abre a Netflix" (e os outros apps), "procura por ___" (digita na TV).

## Teclados dos apps: YouTube e Netflix (como funciona)
No Teclado do app, escolha YouTube ou Netflix e toque em "Digitar". **YouTube:** abra a busca com o destaque na letra A. **Netflix:** abra a busca recém-aberta, com o destaque na lupa (pra digitar de novo, saia da busca e entre outra vez, porque a TV lembra o último botão). O app aperta as setas e o OK da TV, letra por letra, seguindo o desenho do teclado do YouTube. Regras descobertas na QN90A: o destaque começa no A; vogais e C abrem um menu de acentos em que "cima" escolhe o acento (por isso o app nunca sobe a partir delas); de qualquer letra da última linha "baixo" cai no ESPAÇO. Na Netflix o teclado tem 6 colunas (a-f, g-l, m-r, s-x, y z 1-4, 5-0) com ESPAÇO acima de A B C e APAGAR acima de D E F. O simulador do YouTube está em `sim/` (`node sim/test.js`).

## Saída de som (fone Bluetooth)
Config › Saída de som. O app faz o caminho pelo painel Configurações Rápidas da TV (Início, esquerda até a engrenagem, cima, direita até "Saída de Som") e aperta OK uma vez. Cada toque passa pra próxima saída (caixas da TV → fone → óptico); o nome aparece na TV. O fone precisa estar pareado e ligado à TV, e não preso ao celular.
