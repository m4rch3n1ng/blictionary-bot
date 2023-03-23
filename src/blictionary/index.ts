import type { APIEmbed, ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { extendSmallEntries, fetchAllEntries, getEntry, type fullSmallEntry } from "./entry.js"
import { makeEmbed, makeSubEmbed } from "./markdown.js"
import { fuzzy } from "./fuzzy.js"

export async function makeEntry ( interaction: ChatInputCommandInteraction ): Promise<APIEmbed | EmbedBuilder> {
	const word = interaction.options.get("word")
	if (!word) throw new Error("no option specified")

	const query = word.value as string
	const allEntries = await fetchAllEntries()

	// todo implement search
	if (/^\d+$/.test(query)) {
		const id = query
		const entry = await getEntry(id)

		return makeEmbed(allEntries, entry)
	} else {
		const extraEntries = extendSmallEntries(allEntries)

		const allFind = extraEntries.filter(({ word }) => word === query)
		if (allFind.length === 1 && allFind[0]) {
			const find = allFind[0]
			if (find.sub) {
				return makeSubEmbed(allEntries, find)
			} else {
				const entry = await getEntry(find.id)
				return makeEmbed(allEntries, entry)
			}
		}

		const filteredEntries = fuzzy<fullSmallEntry>(query, extraEntries)
		const bestResult = filteredEntries[0]

		if (!bestResult) throw new Error("no match")

		if (bestResult.sub) {
			return makeSubEmbed(allEntries, bestResult)
		} else {
			const entry = await getEntry(bestResult.id)
			return makeEmbed(allEntries, entry)
		}
	}
}
