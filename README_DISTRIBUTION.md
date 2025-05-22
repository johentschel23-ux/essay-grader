# Distribution & Build Instructions for Essay Grader

## Metadata & Packaging
- The app is configured for Windows (NSIS installer), Mac (DMG), and Linux builds using electron-builder.
- All relevant metadata (author, productName, copyright, license, homepage, repository, keywords) are set in `package.json`.

## Icons
- For best results, add your app icons:
  - Windows: `build/icon.ico` (256x256 recommended)
  - Mac: `build/icon.icns` (512x512 recommended)
- You can generate icons from PNGs using tools like [iconverticons.com](https://iconverticons.com/online/).

## Windows Installer (NSIS)
- The installer supports uninstall, desktop/start menu shortcuts, and allows the user to change the install directory.
- Uninstall will remove user data if you check the box during uninstall.

## Building for Windows
1. Install dependencies:
   ```sh
   npm install
   ```
2. Build the React app:
   ```sh
   npm run build
   ```
3. Package the Electron app for Windows:
   ```sh
   npm run dist
   ```
   - The installer `.exe` will be created in the `dist/` directory.

## Building for Mac
Follow the same steps as above. The `.dmg` will appear in `dist/`.

## Troubleshooting
- Ensure you have the correct icon files in `build/`.
- For Windows builds on Mac/Linux, you may need [Wine](https://www.winehq.org/) installed.
- For more options, see [electron-builder documentation](https://www.electron.build/).

## Contact
For issues or contributions, see the [GitHub repo](https://github.com/jonashentschel/essaygrader).
