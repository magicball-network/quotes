/**
 * Parse the YAML files in a source directory into a single quote JSON bundle.
 */
import glob from "glob-promise";
import fs from "node:fs/promises";
import yaml from "yaml";
import path from "node:path";

async function is_dir(path) {
	try {
		let filestat = await fs.stat(path);
		return filestat.isDirectory();
	} catch (e) {
		return false;
	}
}

async function load_yaml(file) {
	let data = await fs.readFile(file, "utf8");
	try {
		return yaml.parse(data);
	} catch (e) {
		throw new Error(`Failed parsing file ${file}: ${e.message}`);
	}
}

function explodeLanguage(data) {
	let langMap = Object.keys(data).filter(k => /[a-z]{2}(-[a-z]*)?/i.test(k) && typeof data[k] === "object");
	let base = {...data};
	for (let lang of langMap) {
		delete base[lang];
	}
	let result = {"en": base};
	for (let lang of langMap) {
		let entry = {...base, ...(data[lang])};
		result["lang"] = entry;
	}
	return result;
}

async function resolveAudioFile(file, lang = "en") {
	let fp = path.parse(file);
	if (lang === "en") {
		lang = "";
	} else {
		lang = `-${lang}`;
	}
	let audioFile = `${fp.dir}/${fp.name}${lang}.webm`;
	try {
		await fs.stat(path.join("dist", audioFile));
		return audioFile;
	} catch (e) {
		return false;
	}
}

async function load_quotes(game, bundlefile) {
	console.log("Processing bundle:", bundlefile);
	let result = {"en": []};
	const bundledir = path.dirname(bundlefile);
	const bundle = explodeLanguage({
		...(await load_yaml(bundlefile)),
	});
	let quotes = await glob(`${bundledir}/*.yaml`);
	for (let quotefile of quotes) {
		if (!path.basename(quotefile).match(/^[0-9]{3}\.yaml$/)) {
			// Not a quote file
			continue;
		}
		let quote = {
			id: `${path.basename(bundledir)}:${path.parse(quotefile).name}`,
			...bundle,
			audio: await resolveAudioFile(quotefile),
			...(await load_yaml(quotefile)),
		};
		result.push(quote);
	}
	return result;
}

async function generate_game_bundle(dirname, destination) {
	let quotes = [];
	let bundles = await glob(`${dirname}/*/_bundle.yaml`);
	for (let bundle of bundles) {
		quotes.push(...(await load_quotes(dirname, bundle)));
	}
	await fs.mkdir(path.dirname(destination), { recursive: true });
	await fs.writeFile(destination, JSON.stringify(quotes));
	console.log(`Merged ${dirname} into ${destination}`);
}

let procs = [];
for (let i = 2; i < process.argv.length; i++) {
	let dirname = process.argv[i];
	if (await is_dir(dirname)) {
		procs.push(generate_game_bundle(dirname, `dist/${dirname}.json`));
	} else {
		console.warn("Not a directory:", dirname);
	}
}

await Promise.all(procs);
