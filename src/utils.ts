import type { ChatInputCommandInteraction, GuildMemberRoleManager } from "discord.js"
import { dirname } from "path"
import { fileURLToPath } from "url"

export const __dirname = dirname(dirname(fileURLToPath(import.meta.url)))

// is allow-listed with role
export function isMember ( interaction: ChatInputCommandInteraction ): boolean {
	const allowListedRole = process.env.DISCORD_ROLE_ID!
	if (!allowListedRole || !allowListedRole.length) return true

	const member = interaction.member
	if (!member) return false

	const roleManager = member.roles as GuildMemberRoleManager
	return roleManager.cache.has(allowListedRole)
}

// is in allow-listed channel
export function isChannel ( interaction: ChatInputCommandInteraction ): boolean {
	const allowListedChannel = process.env.DISCORD_CHANNEL_ID!
	if (!allowListedChannel || !allowListedChannel.length) return true

	const channel = interaction.channel
	if (!channel) return false

	return channel.id === allowListedChannel
}

// is in thread
export function isThread ( interaction: ChatInputCommandInteraction ): boolean {
	const channel = interaction.channel
	if (!channel) return true

	return channel.isThread()
}
