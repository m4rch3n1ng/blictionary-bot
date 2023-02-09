import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { rm } from "node:fs/promises"
import { collectMessages, getTotalChannelCount } from "./collect/index.js"
import { writeProgress } from "./utils.js"

let collectIsRunning = new Map<string, boolean>
export const collect = {
	data: new SlashCommandBuilder().setName("collect").setDescription("collect all messages"),
	async execute ( interaction: ChatInputCommandInteraction ): Promise<any> {
		if (!interaction.guild) return interaction.reply("error") // todo error
		if (collectIsRunning.get(interaction.guild.id)) return interaction.reply("already collecting on this server")
		collectIsRunning.set(interaction.guild.id, true)

		const guildId = interaction.guild.id
		const totalChannels = await getTotalChannelCount(guildId)

		const message = await interaction.deferReply({ fetchReply: true })
		await interaction.editReply(writeProgress(0, 0, totalChannels))

		const zipPath = await collectMessages(guildId, message)
		await message.edit({ content: `collected messages from ${totalChannels} channels`, files: [ zipPath ] })

		await rm(zipPath)
		collectIsRunning.set(interaction.guild.id, false)
	}
}
