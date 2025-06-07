#!/bin/bash
set -euo pipefail

package_version=$(jq -r .version package.json)
git tag "v$package_version"
git push origin "v$package_version"
