const { Readable } = require("node:stream");
const {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel
} = require("@discordjs/voice");
const { Client, Events, GatewayIntentBits } = require("discord.js");
require("dotenv").config();

const {
  DISCORD_TOKEN,
  GUILD_ID,
  PLAY_SILENCE,
  RECONNECT_DELAY_SECONDS,
  VOICE_CHANNEL_ID
} = process.env;

const reconnectDelayMs = Number(RECONNECT_DELAY_SECONDS || 60) * 1000;

if (!DISCORD_TOKEN || !GUILD_ID || !VOICE_CHANNEL_ID) {
  console.error("Il manque DISCORD_TOKEN, GUILD_ID ou VOICE_CHANNEL_ID.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

let connection;
let reconnectTimer;
let reconnecting = false;

class SilenceStream extends Readable {
  _read() {
    this.push(Buffer.from([0xf8, 0xff, 0xfe]));
  }
}

const player = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Play
  }
});

function playSilenceForever() {
  if (PLAY_SILENCE !== "true") return;

  const resource = createAudioResource(new SilenceStream(), {
    inputType: StreamType.Opus
  });

  player.play(resource);
}

player.on(AudioPlayerStatus.Idle, playSilenceForever);
player.on("error", (error) => {
  console.error("Erreur audio, relance du silence:", error.message);
  playSilenceForever();
});

async function connectToVoiceChannel() {
  const guild = await client.guilds.fetch(GUILD_ID);
  const channel = await guild.channels.fetch(VOICE_CHANNEL_ID);

  if (!channel || !channel.isVoiceBased()) {
    throw new Error("VOICE_CHANNEL_ID ne correspond pas a un salon vocal valide.");
  }

  connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: false
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 30_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 30_000)
      ]);
    } catch {
      scheduleReconnect();
    }
  });

  connection.on(VoiceConnectionStatus.Destroyed, () => {
    if (!reconnecting) {
      scheduleReconnect();
    }
  });

  await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
  if (PLAY_SILENCE === "true") {
    connection.subscribe(player);
    playSilenceForever();
  }
  console.log(`Connecte au salon vocal: ${channel.name}`);
}

function scheduleReconnect() {
  if (reconnectTimer) return;

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = undefined;
    reconnecting = true;

    try {
      if (connection?.state.status !== VoiceConnectionStatus.Destroyed) {
        connection?.destroy();
      }
    } catch {
      // La connexion etait deja fermee.
    }

    try {
      await connectToVoiceChannel();
    } catch (error) {
      console.error("Reconnexion impossible, nouvel essai dans 10 secondes:", error.message);
      scheduleReconnect();
    } finally {
      reconnecting = false;
    }
  }, reconnectDelayMs);
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Connecte en tant que ${readyClient.user.tag}`);

  try {
    await connectToVoiceChannel();
  } catch (error) {
    console.error("Impossible de rejoindre le salon vocal:", error.message);
    scheduleReconnect();
  }
});

client.login(DISCORD_TOKEN);
