import { SlashCommandBuilder } from "@discordjs/builders"
import type { ChatInputCommandInteraction } from "discord.js"
import { rm } from "node:fs/promises"
import collectMessages from "./collect/index.js"
import { writeProgress, getTotalChannelCount } from "./collect/utils.js"
import { isMember, isThread, isChannel } from "./utils.js"
import { makeEmbed } from "./entry/entry.js"

let collectIsRunning = new Map<string, boolean>
export const collect = {
	name: "collect",
	data: new SlashCommandBuilder()
		.setName("collect")
		.setDescription("collect all messages"),
	async execute ( interaction: ChatInputCommandInteraction ): Promise<any> {
		if (!isMember(interaction) || !isChannel(interaction) || isThread(interaction)) return

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

export const entry = {
	name: "entry",
	data: new SlashCommandBuilder()
		.setName("entry")
		.setDescription("collect all messages")
		.addStringOption(( option ) => option.setName("word").setDescription("word or article id").setRequired(true)),
	async execute ( interaction: ChatInputCommandInteraction ): Promise<any> {
		try {
			const exampleEmbed = await makeEmbed(interaction)
			interaction.reply({ embeds: [ exampleEmbed ]})
		} catch ( e: unknown ) {
			if (e instanceof Error) {
				interaction.reply({ content: `failed ; ${e.message}` })
			} else {
				interaction.reply({ content: "failed" })
			}
		}
	}
}
