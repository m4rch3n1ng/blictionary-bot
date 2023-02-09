import type { TextChannel } from "discord.js"
import { client } from "../index.js"

export function writeProgress ( channels: number, threads: number, total: number ) {
	// todo more stats
	return `collecting messages from ${total} channels [${channels}/${total}]  [${threads} threads]`
}

export async function hasPerms ( channel: TextChannel ) {
	try {
		await channel.messages.fetch({ limit: 1 })
		return true
	} catch ( error ) {
		return false
	}
}

export async function getTotalChannelCount ( guildId: string ): Promise<number> {
	const guild = client.guilds.cache.get(guildId)!
	const channels = await guild.channels.fetch()

	const textChannels = [ ...channels.values() ].filter(( channel ) => channel && channel.type === 0) as TextChannel[]
	const validChannels = await Promise.all(textChannels.map(( channel ) => hasPerms(channel)))
	return validChannels.filter(( val ) => val).length
}
