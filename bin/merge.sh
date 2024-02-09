#!/usr/bin/env bash

set -e

if ! command -v jq &> /dev/null
then
	echo "jq not installed"
	exit 1
fi

for DIR in $@; do
	if [ -d "$DIR" ]; then
		echo "Merging $DIR/*.json into $DIR.json ..."
		cat $DIR/*.json | jq -s '[ .[] | .[] ]' > "$DIR.json"
	fi
done
