#!/usr/bin/env bash

set -e

if ! command -v jq &> /dev/null
then
	echo "jq not installed"
	exit 1
fi

RESULT=0
for FILE in $@; do
	echo "Validating $FILE"
	if ! $(jq 'empty' "$FILE"); then
		RESULT=1
	fi
done

exit $RESULT
