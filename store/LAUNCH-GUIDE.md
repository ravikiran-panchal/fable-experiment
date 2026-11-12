# Launch guide: Will of Fire: The Last Ember

Written so anyone can follow it. Do one step, tick it, do the next. Stuck on a step? Tell Claude the step number.

Words used here:
- **Terminal** = the black window where you type commands. On a Mac: press Cmd + Space, type Terminal, press Enter.
- **Project folder** = `/Users/Shared/Claude/Fable Experiments/fable-experiment`
- Prices and waiting times are what Claude remembers. The store shows you the real ones.

---

## PART A: Google Play (Android phones)

Time: about 3 to 4 weeks, mostly waiting. Cost: 25 US dollars, paid once.

### A1. Get the tools (one evening)
1. Open https://developer.android.com/studio and click the big Download button.
2. Open the downloaded file and drag Android Studio into Applications.
3. Open Android Studio. Click Next on every screen until it finishes downloading. This takes a while.

### A2. Put the game on your own phone (one evening)
4. In Android Studio click **Open**, and choose the folder called `android` inside the project folder.
5. Wait until the bar at the bottom stops moving. The first time takes several minutes.
6. On your phone: Settings > About phone > tap **Build number** 7 times. Go back, open **Developer options**, switch on **USB debugging**.
7. Plug the phone into the Mac with a cable. On the phone, tap **Allow**.
8. In Android Studio press the green triangle ▶ at the top. The game opens on your phone.
9. Play for 10 minutes. Write down anything broken or slow, and tell Claude before you go on.
10. Take 4 screenshots on the phone while you play. You need them in step 17.

### A3. Open your shop account (10 minutes, then wait a few days)
11. Open https://play.google.com/console and sign in with your Google account.
12. Choose **Yourself** (a personal account). Fill in your name and address.
13. Pay the 25 dollars.
14. Google asks for a photo of your ID. Send it. Wait for the email that says you are verified.

### A4. Make the shop page (30 minutes)
15. In Play Console click **Create app**. Name: `Will of Fire: The Last Ember`. Choose **Game** and **Free**.
16. Open the file `store/listing.md`. Copy the short description and the full description into the boxes.
17. Upload the pictures from the folder `store/graphics`: `play-icon-512.png`, `feature-graphic-1024x500.png`, and the `phone-...png` screenshots (or your own from step 10).
18. Privacy policy box: paste `https://ravikiran-panchal.github.io/fable-experiment/privacy.html`
19. Open `store/data-safety.md` and `store/content-rating.md`. Answer the forms exactly as those files say.

### A5. Make your secret key (10 minutes). Very important
20. In Android Studio: menu **Build > Generate Signed App Bundle or APK**. Choose **Android App Bundle**. Click **Next**.
21. Click **Create new**. Save the key as `will-of-fire-upload.jks` in the project folder. Make up two passwords and an alias called `upload`.
22. Write the passwords on paper and copy the key file to a USB stick. If you lose them you cannot update your game. Never send them to anyone, not even Claude.
23. Click **Next**, choose **release**, click **Create**. You get a file ending in `.aab`. That file is your game.

### A6. The test Google makes you do (14 days)
24. In Play Console open **Testing > Closed testing**. Click **Create new release**. Upload the `.aab` file.
25. Make a list of 12 friends' Gmail addresses under **Testers**. Send them the join link Play Console shows you.
26. All 12 must tap the link and install the game. They must stay joined for 14 days. Fewer than 12, or leaving early, and the clock starts again.

### A7. Go live
27. After 14 days, click **Apply for production** on the Dashboard. Answer the questions about your test.
28. When Google says yes, open **Production**, click **Create new release**, pick the same `.aab`, click **Start rollout**.
29. Wait for the review (often a few days). Then your game is on Google Play. 🎉

---

## PART B: Mac App Store

Time: about 1 week. Cost: 99 US dollars every year.
You do not need Xcode. You need a free app called **Transporter**.

### B1. Join Apple's developer club (10 minutes, then wait up to 2 days)
1. Open https://developer.apple.com/programs/enroll and sign in with your Apple ID.
2. Choose **Individual**. Fill in your details. Pay the 99 dollars.
3. Wait for the email that says **Welcome to the Apple Developer Program**.

### B2. Make your two Apple certificates (20 minutes)
A certificate is Apple's way of knowing the app really came from you.
4. On the Mac open **Keychain Access** (Cmd + Space, type Keychain Access).
5. Menu **Keychain Access > Certificate Assistant > Request a Certificate From a Certificate Authority**.
6. Type your email and name. Choose **Saved to disk**. Click Continue and save the file on the Desktop.
7. Open https://developer.apple.com/account/resources/certificates and click the blue **+**.
8. Choose **Mac App Distribution**. Click Continue. Upload the file from step 6. Download the certificate. Double-click it.
9. Click **+** again. Choose **Mac Installer Distribution**. Upload the same file. Download. Double-click it.

### B3. Tell Apple about your app (10 minutes)
10. On the same website click **Identifiers**, then **+**. Choose **App IDs**, then **App**.
11. Description: `Will of Fire`. Bundle ID: choose **Explicit** and type `io.github.ravikiranpanchal.willoffire`. Click Register.
12. Click **Profiles**, then **+**. Choose **Mac App Store Connect**. Pick the App ID from step 11, then the certificate from step 8. Name it `Will of Fire MAS`. Download it.
13. Rename the downloaded file to `embedded.provisionprofile` and move it into the `desktop` folder inside the project folder.
14. Click **Membership details** on the website. Copy your **Team ID** (10 letters and numbers). Give it to Claude and say "put my Team ID in". (A Team ID is not a secret.)

### B4. Build the Mac app (15 minutes)
15. Open Terminal. Type this and press Enter: `cd "/Users/Shared/Claude/Fable Experiments/fable-experiment"`
16. Type `npm run desktop` and press Enter. Wait for "desktop/www is ready".
17. Type `cd desktop` and press Enter. Then type `npm run mas` and press Enter. Wait a few minutes.
18. Look in the folder `desktop/out/mas-universal`. There is a file ending in `.pkg`. That file is your Mac game.

### B5. Make the shop page (30 minutes)
19. Open https://appstoreconnect.apple.com and click **Apps**, then **+**, then **New App**.
20. Tick **macOS**. Name: `Will of Fire: The Last Ember`. Bundle ID: pick yours. SKU: type `willoffire1`.
21. Open the file `store/mac-listing.md`. Copy each text into the box with the same name.
22. Upload the pictures called `mac-...png` from `store/graphics`.
23. Click **App Privacy**. Choose **No, we do not collect data**. Privacy policy link: `https://ravikiran-panchal.github.io/fable-experiment/privacy.html`
24. Answer the age rating questions using `store/mac-listing.md`. Set the price to **Free**.

### B6. Send the game to Apple
25. Open the **App Store** on your Mac, search **Transporter**, install it, open it, sign in.
26. Drag the `.pkg` file from step 18 into Transporter. Click **Deliver**. Wait about 15 minutes.
27. Back in App Store Connect, find **Build** and click **+**. Choose the build you just sent.
28. Paste the review note from `store/mac-listing.md` into **Notes for review**.
29. Click **Add for Review**, then **Submit**. Apple usually answers in 1 to 3 days. Then your game is on the Mac App Store. 🎉

---

## Updating the game later
- Android: change the game, open `android/app/build.gradle`, make the number after `versionCode` one bigger, run `npm run app`, then repeat steps A20, A23 and A28.
- Mac: change the game, make the version in `desktop/package.json` bigger, repeat steps B16 to B18 and B26 to B29.

## Before you go public
- Rename Tachi and Susake (see `store/listing.md`, "Names and search words").
- Decide about the ale at the bonfire (it can raise the age rating).
