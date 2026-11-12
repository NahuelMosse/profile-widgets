# profile-widgets

Live SVG widgets for a GitHub profile README: contribution streak, heatmap and 3D skyline, what is being built right now, npm downloads, and a card per featured repository and per dev-kit tool. Each request draws the widget from the current GitHub and npm data, in a dark or a light theme, on a transparent background.

It is a set of Node functions under `api/`, with no framework and no build, deployed on Vercel.

## URLs

```
GET /api/profile/<widget>.svg?theme=dark|light
```

Through the lab: `https://lab.nawi.dev/api/profile/streak.svg?theme=dark`. Straight from the project: `https://<project>.vercel.app/api/profile/streak.svg?theme=dark`.

`theme` defaults to `dark`; the `.svg` suffix is optional.

| Widget | Shows |
| --- | --- |
| `streak` | current and longest streak, active days and merged pull requests of the last year |
| `heatmap` | contributions day by day |
| `skyline` | contributions as a 3D skyline |
| `building` | the most recently pushed repo and the latest pull-request activity |
| `npm` | all-time downloads of the dev-kit packages, with a sparkline |
| `npm-<package>` | one package's downloads |
| `repo-<repo>` | a featured repository's card |
| `tool-<package>` | a dev-kit tool's card |

The featured repositories and packages, and the English description each card shows, are in `src/modules/widgets/data/repos.json`. An unknown widget or theme answers `404` with the valid names.

The `views` widget is not here: the profile counts views through komarev, which counts every fetch, so a live widget would count itself. It stays on the profile's daily workflow.

Responses are cached at Vercel's edge (`s-maxage=1800`, `stale-while-revalidate=86400`), so the functions stay inside the free tier. `max-age=1800` is what GitHub's image proxy sees, so it refetches a widget every 30 minutes. When GitHub or npm fail, the answer is `503` with `Retry-After: 300` and is not cached.

## In a README

Use a `<picture>` so GitHub picks the theme of the reader:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://lab.nawi.dev/api/profile/streak.svg?theme=dark">
  <source media="(prefers-color-scheme: light)" srcset="https://lab.nawi.dev/api/profile/streak.svg?theme=light">
  <img alt="Contribution streak" src="https://lab.nawi.dev/api/profile/streak.svg?theme=dark">
</picture>
```

## Local development

Node 22 or newer, no dependencies to install.

```
export GITHUB_TOKEN=$(gh auth token)
npm run dev      # http://localhost:3000/api/profile/streak.svg?theme=dark; PORT picks another port
npm test
```

The GitHub data comes first from what GitHub serves with no token: the contributions calendar from the profile page (`github.com/users/<user>/contributions`, the same numbers the profile shows, private contributions included when the profile shows them) and the rest from the public REST API. `GITHUB_TOKEN`, read from the environment on every request, is the fallback when those fail (an error, the 60-requests-an-hour limit of anonymous REST calls, a profile page whose markup changed); without it such a failure answers `503`. `PROFILE_USER` overrides the GitHub user (default `NahuelMosse`).

## Vercel setup

1. Import the repository as a new Vercel project (Hobby is enough).
2. Framework Preset: **Other**. Leave the build command, the install command and the output directory empty.
3. Environment variable `GITHUB_TOKEN` (the fallback): a fine-grained personal access token with read-only access to public repositories.
4. Deploy. The functions are served at `/api/profile/<widget>.svg`; `lab.nawi.dev/api/profile/*` rewrites to this project.
