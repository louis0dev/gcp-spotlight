# Privacy Policy for GCP Spotlight

Last updated: October 27, 2026

GCP Spotlight is a browser extension that helps users navigate the Google Cloud console through service search, saved project shortcuts, and custom console links. This policy describes the data the extension accesses, uses, and stores.

## Data we handle and why

- **Project settings and preferences:** Project IDs, aliases, project header colors, keyboard preferences, custom console page names and paths, and hidden service entries are stored to personalize navigation.
- **Current tab context:** When needed to open the launcher, the extension reads the active tab URL to identify the Google Cloud project and account selector. It also reads the console page URL to apply project-specific header colors. It does not maintain a general browsing history or send tab URLs to the developer.
- **Service usage:** Service selection counts and last-used timestamps are stored locally to display frequently used services. The last selected project is also stored locally. The extension does not record a general log of keystrokes or mouse activity.
- **Website content:** The extension retrieves Google Cloud's All products page and extracts service names, links, and related catalog information for search. The resulting catalog and its refresh timestamp are cached locally.
- **Operational state:** Temporary launcher window identifiers and catalog refresh attempt timestamps are stored to manage the launcher and limit repeated refresh attempts.

These data are used only to provide the extension's navigation features.

## Storage and synchronization

Project settings and preferences use Chrome's extension sync storage and may sync between browsers through Chrome Sync when enabled. Service usage records, the last selected project, and the service catalog use Chrome's local extension storage. Temporary launcher window state uses session storage.

The developer does not operate a server that receives these settings or usage records. The extension does not include advertising or third-party analytics services.

## Requests to Google Cloud

The extension fetches service names and links from the Google Cloud console's All products page over HTTPS to build a locally cached service catalog. Searches run locally against the available service catalog and your saved custom links; search queries are not sent to Google or the developer.

Catalog requests use your existing signed-in browser session. The browser may include the necessary cookies, but the extension does not directly read or store passwords, session cookies, or authentication tokens.

When you select a service, the extension opens its Google Cloud console page. The destination URL may include your selected project ID and account selector.

Google Cloud and Chrome Sync are subject to [Google's Privacy Policy](https://policies.google.com/privacy).

## Sharing and use restrictions

The extension does not sell user data or transmit it to the developer, advertisers, or analytics providers. Data may be processed by Google as described above to provide Google Cloud navigation and Chrome synchronization.

User data is not used or transferred for purposes unrelated to the extension's stated functionality, personalized advertising, creditworthiness assessments, or lending decisions.

## Retention and user controls

Stored settings, usage records, and cached data remain in Chrome extension storage until removed, replaced, or cleared. You can edit or delete saved projects and custom console links in the extension settings. Refreshing the service catalog replaces the cached catalog.

Uninstalling the extension removes its local extension storage. Data synchronized through Chrome Sync is also subject to Chrome's synchronization settings and Google's retention practices. You can manage synchronization through Chrome settings.

## Changes to this policy

This policy may be updated when the extension's functionality or data handling changes. The latest version will be published on this page with an updated date.

## Contact

For privacy questions, open an issue in the [GCP Spotlight GitHub repository](https://github.com/louis0dev/gcp-spotlight/issues). Issues are public; do not include credentials, confidential project details, or other sensitive information.
