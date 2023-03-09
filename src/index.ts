import { Client, Collection, Events, GatewayIntentBits } from "discord.js"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })
import { existsSync } from "node:fs"
import { mkdir } from "node:fs/promises"
import * as importCommands from "./commands.js"

const token = process.env.DISCORD_BOT_TOKEN
export const client = new Client({ intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ] })

const commands = new Collection<string, typeof importCommands.collect>()
Object.values(importCommands).forEach(( cmd ) => commands.set(cmd.name, cmd))

client.on(Events.InteractionCreate, async ( interaction ) => {
	if (!interaction.isChatInputCommand()) return

	const command = commands.get(interaction.commandName)
	if (!command) return

	await command.execute(interaction)
})

client.once(Events.ClientReady, async ( c ) => {
	console.log(`logged in as ${c.user.tag}`)
	if (!existsSync(".tmp")) await mkdir(".tmp")
})

client.login(token)
