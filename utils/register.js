import { REST, Routes, SlashCommandBuilder } from "discord.js"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN)

const collect = new SlashCommandBuilder()
	.setName("collect")
	.setDescription("collect all messages")

await rest.put(
	Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
	{ body: [ collect.toJSON() ] }
)
