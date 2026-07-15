export const GITHUB_REPOSITORY_URL = "https://github.com/JonathanHHenson/evolution_revision_guide"

export function githubFileUrl(repositoryPath: string): string {
  const encodedPath = repositoryPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")
  return `${GITHUB_REPOSITORY_URL}/blob/main/${encodedPath}`
}
