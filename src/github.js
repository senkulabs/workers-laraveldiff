import { Octokit } from "octokit";

export async function allTags(repository) {
	const octokit = new Octokit();

	const [owner, repo] = repository.split('/', 2);

	/**
	 * @type {any[]}
	 */
	let tagNames = [];
	for await (const response of octokit.paginate.iterator(
		octokit.rest.repos.listTags,
		{ owner, per_page: 100, repo }
	)) {
		tagNames = tagNames.concat(response.data.map((data) => data.name));
	}

	return tagNames;
}

export async function getDiff(repository, sourceVersion, targetVersion) {
	try {
		const octokit = new Octokit();

		const [owner, repo] = repository.split('/', 2);
		/**
		 * @type {any[]}
		 */
		let files = [];
		// Exclude filename when get patch between two versions.
		const excludeFilenames = ['CHANGELOG.md', '.github', 'README.md'];

		for await (const response of octokit.paginate.iterator(
			octokit.rest.repos.compareCommitsWithBasehead,
			{
				basehead: `${sourceVersion}...${targetVersion}`,
				owner,
				per_page: 100,
				repo
			}
		)) {
			if (response.data.files) {
				files = files.concat(response.data.files).filter((file) => {
					return !excludeFilenames.some(prefix => file.filename.startsWith(prefix));
				});
			}
		}

		const result = files.filter((/** @type {{ sha: any; filename: any; patch: string; }} */ item) => {
            if (item.patch !== undefined) {
                return {
                    sha: item.sha,
                    filename: item.filename,
                    source_url: `https://github.com/${repository}/blob/${sourceVersion}/${item.filename}`,
                    target_url: `https://github.com/${repository}/blob/${targetVersion}/${item.filename}`,
                    lines: parsedLines(item.patch),
                }
            }
		});

		return result;
	} catch (error) {
		throw new Error(`Cannot get diff between source version: ${sourceVersion} and target version: ${targetVersion}`);
	}
}

function parsedLines(diffString) {
	const lines = diffString.split('\n');

    const parsedLines = lines.map((/** @type {string} */ line, /** @type {number} */ index) => {
        let status = 'unchanged';

        // Check the first character of the line to determine the status
        if (line.startsWith('+')) {
            status = 'add';
        } else if (line.startsWith('-')) {
            status = 'remove';
        }

        return {
            number: index + 1,
            text: line,
            status: status
        }
    });

    return parsedLines;
}
