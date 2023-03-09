import { AnyThreadChannel, Collection, Message, MessageManager, ThreadManager } from "discord.js"
import * as dotenv from "dotenv"
import PQueue from "p-queue"
import $7z from "7zip-min"
import { writeFile, mkdir, rm } from "node:fs/promises"
import { join as joinPath } from "node:path"
import { client } from "../index.js"
import { __dirname } from "../utils.js"
import { writeProgress, hasMessagePerms, getTotalChannelCount, hasThreadPerms } from "./utils.js"
dotenv.config({ path: ".env" })

export default async function collectMessages ( guildId: string, message: Message<boolean> ): Promise<string> {
	const guild = client.guilds.cache.get(guildId)!
	const channels = await guild.channels.fetch()

	const totalChannels = await getTotalChannelCount(guildId)
	const path = joinPath(__dirname, ".tmp", new Date().toISOString().replace(/:/g, "-"))
	const zipPath = `${path}.7z`

	await mkdir(path)

	let channelProgress = 0
	let threadProgress = 0

	await Promise.all(
		[ ...channels.values() ].map(async ( channel ) => {
			if (!channel) return

			// https://discord-api-types.dev/api/discord-api-types-v10/enum/ChannelType
			if ((channel.type === 0 || channel.type === 15) && await hasThreadPerms(channel)) {
				const { threads: activeThreads } = await channel.threads.fetchActive(false)
				const archivedThreads = await fetchAllArchivedThreads(channel.threads)
	
				const allThreads = new Collection([ ...activeThreads, ...archivedThreads ])
	
				if (allThreads.size > 0) {
					await Promise.all(
						[ ...allThreads.values() ].map(async ( thread ) => {
							const messages = await fetchAllMessages(thread.messages, undefined, channel.name)
							const threadJSON = {
								name: thread.name,
								channelName: channel.name,
								type: "thread",
								messages: messages.reverse()
							}
							await writeFile(joinPath(path, `${channel.id}.${thread.id}.json`), JSON.stringify(threadJSON))
							threadProgress += 1
							await message.edit({ content: writeProgress(channelProgress, threadProgress, totalChannels) })
						})
					)
				}
			}

			if ((channel.type === 0 || channel.type === 2 || channel.type === 5) && await hasMessagePerms(channel)) {
				const messages = await fetchAllMessages(channel.messages, undefined, channel.name)

				const channelJSON = {
					name: channel.name,
					type: channel.type === 0 ? "text" : ( channel.type === 2 ? "voice" : "news" ),
					messages: messages.reverse(),
				}
				await writeFile(joinPath(path, `${channel.id}.json`), JSON.stringify(channelJSON))

				channelProgress += 1
				await message.edit({ content: writeProgress(channelProgress, threadProgress, totalChannels) })
			}
		})
	)

	await new Promise<void>(( resolve, reject ) => (
		$7z.cmd([
			"a", "-t7z", "-m0=lzma2", "-mmt=on", "-md1024m", "-mfb273", "-mx=9", "-ms=on", "-aoa",
			"--",
			zipPath,
			path
		], ( error ) => error ? reject(error) : resolve())
	))

	await rm(path, { recursive: true })
	return zipPath
}

interface interMessage {
	type: "message"
	author: string
	content: string
	time: Date
}

interface interCommand {
	type: "command"
	author: string
	command: string
	options: string[]
	time: Date
}

async function fetchAllArchivedThreads ( threadManager: ThreadManager, id?: AnyThreadChannel<boolean> ): Promise<Collection<string, AnyThreadChannel>> {
	const { threads } = await threadManager.fetchArchived({ limit: 100, before: id })

	if (threads.size < 100) {
		return threads
	} else {
		const lastThread = threads.at(99)
		const restThreads = await fetchAllArchivedThreads(threadManager, lastThread)
		return new Collection([ ...threads, ...restThreads ])
	}
}

async function fetchAllMessages ( messageManager: MessageManager<true>, id?: string, name?: string ): Promise<(interMessage|interCommand)[]> {
	const allCollection = await messageManager.fetch({ limit: 100, before: id })

	if (allCollection.size < 100) {
		return format(allCollection)
	} else {
		const lastMsg = allCollection.at(99)
		const [ arr, rest ] = await Promise.all([
			format(allCollection),
			fetchAllMessages(messageManager, lastMsg!.id, name)
		])
		return [ ...arr, ...rest ]
	}
}

const queue = new PQueue({ concurrency: 1 })
const commandsToCollect: string[] = JSON.parse(process.env.DISCORD_COLLECT_COMMANDS!)
async function format ( collection: Collection<string, Message> ): Promise<(interMessage|interCommand)[]> {
	const filtered: (interMessage|interCommand)[] = []

	for (const message of collection.values()) {
		if ((message.type === 0 || message.type === 19) && message.content !== "" && !message.author.bot) {
			filtered.push({
				type: "message",
				author: `${message.author.username}#${message.author.discriminator}`,
				content: message.content,
				time: new Date(message.createdTimestamp)
			})
		} else if (message.type === 19) {
		} else if (message.type === 20 && message.interaction && `${message.author.username}#${message.author.discriminator}` === process.env.DISCORD_ESMBOT_TAG && commandsToCollect.includes(message.interaction.commandName)) {
			const options = await queue.add(() => getInteractionData(message.channelId, message.id))
			if (options && options.length > 0) {
				filtered.push({
					type: "command",
					author: `${message.interaction.user.username}#${message.interaction.user.discriminator}`,
					command: message.interaction.commandName,
					options: options,
					time: new Date(message.createdTimestamp)
				})
			}
		}
	}

	return filtered
}

interface thingJson {
	options?: Array<{ type: number, name: string, value: string }>
}

interface errorJson {
	message: string
	retry_after: number
}

async function getInteractionData ( channelID: string, messageID: string ): Promise<string[] | null> {
	// https://discord.com/api/v9/channels/{CHANNEL_ID}/messages/{MESSAGE_ID}/interaction-data
	const request = await fetch(`https://discord.com/api/v9/channels/${channelID}/messages/${messageID}/interaction-data`,	{
		headers: {
			Authorization: process.env.DISCORD_USR_TOKEN!,
			"X-Super-Properties": process.env["X-SUPER-PROPERTIES"]!
		}}
	)

	const json = await request.json() as (errorJson | thingJson)

	if ("message" in json && json.message === "You are being rate limited." && typeof json.retry_after === "number" ) {
		let options: string[] | null = []
		await new Promise<void>(( resolve ) => {
			setTimeout(async () => {
				options = await getInteractionData(channelID, messageID)
				resolve()
			}, json.retry_after + 50)
		})
		return options
	} else {
		if ("options" in json && json.options && json.options.length > 0) {
			return json.options.map(({ value }) => value)
		} else {
			return null
		}
	}
}
