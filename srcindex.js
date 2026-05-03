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

const { DISCORD_TOKEN, GUILD_ID, VOICE_CHANNEL_ID } = process.env;

if (!DISCORD_TOKEN || !GUILD_ID || !VOICE_CHANNEL_ID) {
  console.error("Il manque DISCORD_TOKEN, GUILD_ID ou VOICE_CHANNEL_ID.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

let connection;
let reconnectTimer;

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
  const resource = createAudioResource(new SilenceStream(), {
    inputType: StreamType.Opus
  });

  player.play(resource);
}

player.on(AudioPlayerStatus.Idle, playSilenceForever);
player.on("error", () => playSilenceForever());

async function connectToVoiceChannel() {
  const guild = await client.guilds.fetch(GUILD_ID);
  const channel = await guild.channels.fetch(VOICE_CHANNEL_ID);

  if (!channel || !channel.isVoiceBased()) {
    throw new Error("VOICE_CHANNEL_ID n'est pas un salon vocal valide.");
  }

  connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: guild.id,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: false
  });

  connection.on(VoiceConnectionStatus.Disconnected, scheduleReconnect);
  connection.on(VoiceConnectionStatus.Destroyed, scheduleReconnect);

  await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

  connection.subscribe(player);
  playSilenceForever();

  console.log(`Bot connecte au salon vocal: ${channel.name}`);
}

function scheduleReconnect() {
  if (reconnectTimer) return;

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = undefined;

    try {
      if (connection?.state.status !== VoiceConnectionStatus.Destroyed) {
        connection.destroy();
      }
    } catch {}

    try {
      await connectToVoiceChannel();
    } catch (error) {
      console.error("Reconnexion ratee, nouvel essai dans 10 secondes:", error.message);
      scheduleReconnect();
    }
  }, 10_000);
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Connecte en tant que ${readyClient.user.tag}`);

  try {
    await connectToVoiceChannel();
  } catch (error) {
    console.error(error.message);
    scheduleReconnect();
  }
});

client.login(DISCORD_TOKEN);
