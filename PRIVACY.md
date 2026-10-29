# Privacy Policy for GCP Spotlight

Last updated: October 29, 2026

GCP Spotlight is a browser extension that helps users navigate the Google Cloud console through service search, saved project shortcuts, and project-specific links to console pages and external tools such as Airflow and Dataproc YARN. This policy describes the data the extension accesses, uses, and stores.

## Data we handle and why

- **Project settings and preferences:** Project IDs, aliases, project header colors, keyboard preferences, custom page names and URLs with their project associations, and hidden service entries are stored to personalize navigation.
- **Current tab context:** When needed to open the launcher, the extension reads the active tab URL to identify the Google Cloud project and account selector. It also reads the console page URL to apply project-specific header colors. On custom sites for which you grant access, it reads the page URL to match your saved project and adds a thin project color strip. This also supports navigation within that site. No custom site content is collected. It does not maintain a general browsing history or send tab URLs to the developer.
- **Service and custom page usage:** Selection counts and last-used timestamps for services and custom pages are stored locally to display frequently used services. The last selected project is also stored locally. The extension does not record a general log of keystrokes or mouse activity.
- **Website content:** The extension retrieves Google Cloud's All products page and extracts service names, links, and related catalog information for search. The resulting catalog and its refresh timestamp are cached locally.
- **Operational state:** Temporary launcher window identifiers and catalog refresh attempt timestamps are stored to manage the launcher and limit repeated refresh attempts.

These data are used only to provide the extension's navigation features.

## Storage and synchronization

Project IDs, aliases, header colors, keyboard preferences, hidden service entries, and custom page names, URLs, and project associations use Chrome's extension sync storage and may sync between browsers through Chrome Sync when enabled. Service usage records, the last selected project, and the service catalog use Chrome's local extension storage. Temporary launcher window state uses session storage.

External custom URLs are stored with their path, query string, and fragment. Any sensitive information included in a saved URL is therefore part of the saved settings and may sync through Chrome Sync.

The developer does not operate a server that receives these settings or usage records. The extension does not include advertising or third-party analytics services.

## Site access permissions

The extension has access to the Google Cloud console to retrieve its service catalog and apply project header colors. When you invoke the launcher, Chrome's active-tab permission allows it to display the launcher on the current page where supported.

When you click Add for an external custom URL, the extension requests optional access to that site's host so it can display the project color strip. Chrome controls the permission prompt. Already granted access does not require another approval. If you decline the request, the page is not added and the entered values remain available for retrying.

Although the extension declares support for optional HTTP and HTTPS site access, this does not grant access to all sites by default. Requests are limited to the site being added. Site access applies to the matching scheme and hostname, across its paths and ports, rather than only the exact saved URL. The extension uses this access to match page URLs and display the color strip; it does not collect the site's page content.

You can manage or revoke granted site access in Chrome's extension settings.

## Requests to Google Cloud and custom sites

The extension fetches service names and links from the Google Cloud console's All products page over HTTPS to build a locally cached service catalog. Searches run locally against the available service catalog and your saved custom links; search queries are not sent to Google or the developer.

Catalog requests use your existing signed-in browser session. The browser may include the necessary cookies, but the extension does not directly read or store your browser session cookies or sign-in credentials. URLs that you explicitly save are stored as described above.

When you select a service or custom console page, the extension opens its Google Cloud console page. The destination URL may include your selected project ID and account selector. When you select an external custom page, the extension opens its saved URL without adding console project or account parameters. The browser connects to that destination normally, and the destination may receive the URL path and query parameters and use its own signed-in session. External sites handle those requests under their own privacy policies.

Google Cloud and Chrome Sync are subject to [Google's Privacy Policy](https://policies.google.com/privacy).

## Sharing and use restrictions

The extension does not sell user data or transmit it to the developer, advertisers, or analytics providers. Data may be processed by Google as described above to provide Google Cloud navigation and Chrome synchronization.

User data is not used or transferred for purposes unrelated to the extension's stated functionality, personalized advertising, creditworthiness assessments, or lending decisions.

## Retention and user controls

Stored settings, usage records, and cached data remain in Chrome extension storage until removed, replaced, or cleared. You can manage saved projects and custom pages in the extension settings, change a custom page's project association, or delete saved entries. The launcher's Clear action, followed by confirmation, removes service and custom page usage counts and last-used timestamps; it does not remove saved settings or the last selected project. Refreshing the service catalog replaces the cached catalog.

Deleting a custom page stops it from being used to determine the project color strip. Deleting the page does not automatically revoke site access already granted in Chrome; you can revoke that access in Chrome's extension settings.

Uninstalling the extension removes its local extension storage. Data synchronized through Chrome Sync is also subject to Chrome's synchronization settings and Google's retention practices. You can manage synchronization through Chrome settings.

## Changes to this policy

This policy may be updated when the extension's functionality or data handling changes. The latest version will be published on this page with an updated date.

## Contact

For privacy questions, open an issue in the [GCP Spotlight GitHub repository](https://github.com/louis0dev/gcp-spotlight/issues). Issues are public; do not include credentials, confidential project details, or other sensitive information.
