import type { APIEmbed, ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { allSmallEntry, cache, flatSubEntries, getEntry } from "./entry.js"
import { makeEmbed, makeSubEmbed } from "./markdown.js"
import { fuzzy } from "./fuzzy.js"

export async function makeEntry ( interaction: ChatInputCommandInteraction ): Promise<APIEmbed | EmbedBuilder> {
	const word = interaction.options.get("word")
	if (!word) throw new Error("no option specified")

	const query = word.value as string
	const allEntries = await cache.get()

	// todo implement search
	if (/^\d+$/.test(query)) {
		const id = query
		const entry = await getEntry(id)

		return makeEmbed(allEntries, entry)
	} else {
		const extraEntries = flatSubEntries(allEntries)

		const allFind = extraEntries.filter(({ word }) => word === query)
		if (allFind.length === 1 && allFind[0]) {
			const find = allFind[0]
			if (find.isSub) {
				return makeSubEmbed(allEntries, find)
			} else {
				const entry = await getEntry(find.id)
				return makeEmbed(allEntries, entry)
			}
		}

		const filteredEntries = fuzzy<allSmallEntry>(query, extraEntries)
		const bestResult = filteredEntries[0]

		if (!bestResult) throw new Error("no match")

		if (bestResult.isSub) {
			return makeSubEmbed(allEntries, bestResult)
		} else {
			const entry = await getEntry(bestResult.id)
			return makeEmbed(allEntries, entry)
		}
	}
}
