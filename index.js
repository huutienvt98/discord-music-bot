const fs = require("fs");
const Discord = require("discord.js");
const Client = require("./client/Client");
const discordTTS = require("discord-tts");
const { prefix, token, activity, activityType } = require("./config.json");
const ytdl = require("ytdl-core");
const { Player } = require("discord-player");
const { channel } = require("diagnostics_channel");
const {
  AudioPlayer,
  createAudioResource,
  StreamType,
  entersState,
  VoiceConnectionStatus,
  joinVoiceChannel,
} = require("@discordjs/voice");

let voiceConnection;
let audioPlayer = new AudioPlayer();

const client = new Client();
client.commands = new Discord.Collection();

// Set client commands
const commandFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

console.log(client.commands);

// Check client status
client.once("ready", () => {
  console.log("Ready!");
});
client.on("ready", function () {
  client.user.setActivity(activity, { type: activityType });
});
client.once("reconnecting", () => {
  console.log("Reconnecting!");
});
client.once("disconnect", () => {
  console.log("Disconnect!");
});

// Set Player interaction
const player = new Player(client);
player.on("error", (queue, error) => {
  console.log(
    `[${queue.guild.name}] Error emitted from the queue: ${error.message}`
  );
});

player.on("connectionError", (queue, error) => {
  console.log(
    `[${queue.guild.name}] Error emitted from the connection: ${error.message}`
  );
});

player.on("trackStart", (queue, track) => {
  queue.metadata.send(
    `▶ | Started playing: **${track.title}** in **${queue.connection.channel.name}**!`
  );
});

player.on("trackAdd", (queue, track) => {
  queue.metadata.send(`🎶 | Track **${track.title}** queued!`);
});

player.on("botDisconnect", (queue) => {
  queue.metadata.send(
    "❌ | I was manually disconnected from the voice channel, clearing queue!"
  );
});

player.on("channelEmpty", (queue) => {
  queue.metadata.send("❌ | Nobody is in the voice channel, leaving...");
});

player.on("queueEnd", (queue) => {
  queue.metadata.send("✅ | Queue finished!");
});

// Deploy
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!client.application?.owner) await client.application?.fetch();

  if (
    message.content === "!deploy" &&
    message.author.id === client.application?.owner?.id
  ) {
    await message.guild.commands
      .set(client.commands)
      .then(() => {
        message.reply("Deployed!");
      })
      .catch((err) => {
        message.reply(
          "Could not deploy commands! Make sure the bot has the application.commands permission!"
        );
        console.error(err);
      });
  }
});

// Slash commands
client.on("interactionCreate", async (interaction) => {
  const command = client.commands.get(interaction.commandName.toLowerCase());

  try {
    command.execute(interaction, player);
  } catch (error) {
    console.error(error);
    interaction.followUp({
      content: "There was an error trying to execute that command!",
    });
  }
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  if (
    oldState.channelId === null &&
    oldState.member.user.username === "huutienvt98"
  ) {
    const stream = discordTTS.getVoiceStream(
      "Hear ye hear ye! The king of clowns is here!"
    );
    const audioResource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
      inlineVolume: true,
    });
    if (
      !voiceConnection ||
      voiceConnection?.status === VoiceConnectionStatus.Disconnected
    ) {
      console.log(
        newState.channelId,
        newState.guild.id,
        newState.guild.voiceAdapterCreator
      );
      voiceConnection = joinVoiceChannel({
        channelId:
          newState.channelId !== null
            ? newState.channelId
            : "738641494759440384",
        guildId: newState.guild.id,
        adapterCreator: newState.guild.voiceAdapterCreator,
      });
      voiceConnection = await entersState(
        voiceConnection,
        VoiceConnectionStatus.Connecting,
        5_000
      );
    }

    if (voiceConnection.status === VoiceConnectionStatus.Connected) {
      voiceConnection.subscribe(audioPlayer);
      audioPlayer.play(audioResource);
    }

    console.log("Nick is here");
    console.log(client.channels);
    const channel = await client.channels.fetch("523067858943737861");
    channel.send(`Hear ye hear ye! The 👑 of 🤡 is here!`);
  }
  console.log(oldState.member.user.username);
});

client.login(token);
