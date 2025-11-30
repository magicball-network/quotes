import path from "node:path";
import fs from "node:fs/promises";
import HQRLib from "@lbalab/hqr";
import iconv from "iconv-lite";
import yaml from "yaml";

const gameInfo = {
	lba1: {
		lang: ["en", "fr", "de", "es", "it"],
        // no idea what \x01 does
        // '@' are newlines
        postProcess: (text) => text.replaceAll("\x01", "").replaceAll(/ ?@ ?/g, "\n"),
	},
	lba2: {
		lang: ["en", "fr", "de", "es", "it"],
        // first byte is the dialog type
        // '@' are newlines
        postProcess: (text) => text.substr(1).replaceAll(/ ?@ ?/g, "\n"),
	},
};

function getLbtInfo(mode, bundleCount, hqrIndex) {
	// First text bundle ID is 2
	const bundleId = ("00" + (((hqrIndex - 1) % bundleCount) + 2)).slice(-2);
	const lang = gameInfo[mode].lang[Math.floor((hqrIndex - 1) / bundleCount)];
	return { mode, hqrIndex, bundleId, lang };
}

function readShort(byteArray, index) {
	return new Uint16Array(byteArray, index, 2)[0];
}

async function procLbtEntry(lbtInfo, id, text) {
	id = ("000" + id).slice(-3);
	const filename = `${lbtInfo.mode}/${lbtInfo.bundleId}/${id}.yaml`;
	let data;
	try {
		const filedata = await fs.readFile(filename, "utf8");
		data = yaml.parse(filedata);
	} catch (e) {
		data = { location: null, speaker: null, message: null };
	}
	if (lbtInfo.lang === "en") {
		data.message = text;
	} else {
		if (!data[lbtInfo.lang]) {
			data[lbtInfo.lang] = {};
		}
		data[lbtInfo.lang].message = text;
	}
	await fs.mkdir(path.dirname(filename), { recursive: true });
	await fs.writeFile(
		filename,
		yaml.stringify(data, {
			nullStr: "",
			defaultKeyType: "PLAIN",
		}),
	);
}

async function procLbt(lbtInfo, byteArray) {
	console.log("Processing LBT:", lbtInfo);
	const entries = [];
	const end = byteArray.byteLength;
	for (let i = 0; i < end; i += 2) {
		const val = readShort(byteArray, i);
		if (val === end) {
			break;
		}
		entries.push({ start: val, end: val });
		if (entries.length > 1) {
			entries[entries.length - 2].end = val;
		}
	}
	if (entries.length > 0) {
		entries[entries.length - 1].end = end;
	}
	console.log("Bundle entries:", entries.length);
	for (let i = 0; i < entries.length; ++i) {
		let text = iconv.decode(
			new Uint8Array(
				byteArray.slice(entries[i].start, entries[i].end - 1),
			),
			"cp437",
		);
		text = gameInfo[lbtInfo.mode].postProcess(text);
		await procLbtEntry(lbtInfo, i + 1, text.trim());
	}
}

async function procFile(mode, file) {
	console.log("Processing file:", file);
	const data = await fs.readFile(file);
	const hqr = HQRLib.HQR.fromArrayBuffer(
		data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
	);
	console.log("Number of entries in file:", hqr.entries.length);
    if (hqr.entries.length % gameInfo[mode].lang.length !== 0) {
        throw new Error("Bundle count not a round number. Invalid language config?");
    }
	const bundles = Math.floor(hqr.entries.length / gameInfo[mode].lang.length);
	for (let i = 0; i < hqr.entries.length; ++i) {
		let entry = hqr.entries[i];
		if (!entry) {
			continue;
		}
		if (i % bundles > 8) {
			// FIXME: no more in demo
			continue;
		}
		if (i % 2 == 1) {
			await procLbt(getLbtInfo(mode, bundles, i), entry.content);
		}
	}
}

if (process.argv.length !== 4) {
	throw new Error(
		`Usage: ${process.argv[0]} ${process.argv[1]} <lba1|lba2> <text.hqr>`,
	);
}

switch (process.argv[2]) {
	case "lba1":
	case "lba2":
		await procFile(process.argv[2], process.argv[3]);
		break;
	default:
		throw new Error(`Unknown mode: ${process.argv[2]}`);
}
