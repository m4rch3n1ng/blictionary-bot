import { APIApplicationCommand, REST, Routes } from "discord.js"
import * as dotenv from "dotenv"
import { client } from "./index.js"
import * as commands from "./commands.js"
dotenv.config({ path: ".env" })

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN!)

const discordCommands: APIApplicationCommand[] = await rest.get(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!)) as APIApplicationCommand[]
await Promise.all(
	discordCommands.map(( discordCommand ) => (
		rest.delete(Routes.applicationCommand(process.env.DISCORD_CLIENT_ID!, discordCommand.id))
	))
)

await rest.put(
	Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!),
	{ body: Object.values(commands).map(({ data }) => data.toJSON()) }
)

client.destroy()
