# Data safety form: answers

These match what the app actually does. If you ever add adverts, analytics, accounts or cloud saves, redo this.

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | No |
| Is all of the user data collected by your app encrypted in transit? | Not applicable (none collected) |
| Do you provide a way for users to request that their data is deleted? | Not applicable (none collected) |

**Why "No" is correct even though the app asks for the camera:** Google counts data as "collected" only when
it leaves the device. Camera frames are read on the device to recognise hand signs and are never stored or
sent. Say this in the permission declaration if Play Console asks why the camera is needed:

> The camera is an optional control method. The player can turn it on to cast in-game spells with real hand
> signs. Frames are processed on the device in real time and are never recorded, stored or transmitted. The
> game is fully playable without it.

Other declarations:

| Question | Answer |
| --- | --- |
| Does your app contain ads? | No |
| App access (login needed?) | All functionality is available without special access |
| Target audience | 13 and over is the simplest honest choice. Choosing under 13 brings the Families policy and extra review |
| News app, COVID-19 app, health app, financial features, government app | No to all |
| Advertising ID | Not used |
