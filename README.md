# Discord Voice Stay Bot

Bot Discord qui rejoint automatiquement un salon vocal, joue du silence en continu et tente d'y rester le plus longtemps possible.

## Installation

1. Installe Node.js 18 ou plus recent.
2. Installe les dependances :

```bash
npm install
```

3. Copie `.env.example` en `.env`, puis remplis les valeurs :

```env
DISCORD_TOKEN=ton_token_discord
GUILD_ID=id_de_ton_serveur
VOICE_CHANNEL_ID=id_du_salon_vocal
```

## Lancer le bot

```bash
npm start
```

## Le laisser tourner longtemps

Pour eviter que le bot reste coupe si Node.js plante ou si le processus s'arrete, utilise PM2 :

```bash
npm install -g pm2
npm run start:pm2
pm2 save
```

Commandes utiles :

```bash
pm2 logs discord-voice-stay-bot
npm run stop:pm2
pm2 restart discord-voice-stay-bot
```

## Mettre sur GitHub puis Railway

Ne mets jamais ton fichier `.env` sur GitHub. Le fichier `.gitignore` l'exclut deja.

Railway est conseille pour ce bot parce qu'il peut lancer un processus Node.js sans serveur web. Le fichier `railway.json` indique a Railway de lancer `npm start`, qui execute `node index.js`, et de redemarrer le bot si le processus tombe.

Variables a ajouter sur Railway :

```env
DISCORD_TOKEN=ton_token_discord
GUILD_ID=id_de_ton_serveur
VOICE_CHANNEL_ID=id_du_salon_vocal
PLAY_SILENCE=false
RECONNECT_DELAY_SECONDS=300
```

Laisse `PLAY_SILENCE=false` si Discord affiche que le bot a du mal a se connecter a l'appel. Mets `PLAY_SILENCE=true` seulement si ton hebergeur coupe le bot quand il reste sans audio.
Garde `RECONNECT_DELAY_SECONDS=300` pour eviter que le bot reconnecte trop vite et fasse bug l'affichage du chrono Discord.

## Important

- Active le mode developpeur Discord pour copier les IDs : `Parametres utilisateur > Avances > Mode developpeur`.
- Invite le bot avec les permissions necessaires pour voir et rejoindre le salon vocal.
- Dans le portail Discord Developer, active les intents si ton application en a besoin. Pour ce bot, les intents utilises sont `Guilds` et `GuildVoiceStates`.
- Ne partage jamais ton token Discord.
- Aucun bot ne peut garantir une connexion infinie a 100% : Discord, l'hebergement, le reseau ou le PC peuvent couper. PM2 permet surtout de relancer vite le bot si le programme tombe.
