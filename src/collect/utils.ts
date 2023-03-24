import type { ForumChannel, NewsChannel, TextChannel, VoiceChannel } from "discord.js"
import { client } from "../index.js"

export function writeProgress ( channels: number, threads: number, total: number ) {
	// todo more stats
	return `collecting messages from ${total} channels [${channels}/${total}] [${threads} threads]`
}

export async function hasMessagePerms ( channel: TextChannel | VoiceChannel | NewsChannel ) {
	try {
		await channel.messages.fetch({ limit: 1 })
		return true
	} catch {
		return false
	}
}

export async function hasThreadPerms ( channel: TextChannel | ForumChannel ) {
	try {
		const { threads: activeThreads } = await channel.threads.fetchActive()
		if (activeThreads.size > 0) await activeThreads.at(0)?.messages.fetch({ limit: 1 })

		const { threads: archivedThreads } = await channel.threads.fetchArchived()
		if (archivedThreads.size > 0) await archivedThreads.at(0)?.messages.fetch({ limit: 1 })

		return true
	} catch {
		return false
	}
}

export async function getTotalChannelCount ( guildId: string ): Promise<number> {
	const guild = client.guilds.cache.get(guildId)!
	const channels = await guild.channels.fetch()

	const textChannels = [ ...channels.values() ].filter(( channel ) => channel && (channel.type === 0 || channel.type === 2 || channel.type === 5)) as TextChannel[]
	const validChannels = await Promise.all(textChannels.map(( channel ) => hasMessagePerms(channel)))
	return validChannels.filter(( val ) => val).length
}
