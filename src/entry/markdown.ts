import type { smallMeta } from "./entry"

export function initMark ( allMeta: smallMeta[] ) {
	return function marked ( txt: string ) {
		const modTxt = txt.replace(/\[\[([^\n]+?), ([^\n]+?\.)\]\]/g, replaceSelfLink)
		return modTxt
	}

	function replaceSelfLink ( _full: string, word: string, wordClass: string ) {
		const found = findEntry(word, wordClass)
		return `[${word}, ${wordClass}](${new URL(`/view/${found ? found.id : 404}/${word}`, process.env.BLICTIONARY_URL!)})`
	}

	function findEntry ( word: string, wordClass: string ) {
		const found = allMeta.find(( meta ) => 
			meta.word === word && ( Array.isArray(meta.class) ? meta.class.includes(wordClass) : meta.class === wordClass )
		)
		return found
	}	
}
