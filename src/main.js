const electron = require('electron')
const path = require('path')
const url = require('url')

let app = electron.app

let win

app.on("ready", () => {
	win = new electron.BrowserWindow({
		width: 800,
		height: 600,
		show: false,
	})
	
	win.loadURL(url.format({
		protocol: 'file:',
		pathname: path.join(__dirname, 'index.html'),
	}))
	
	win.on("page-title-updated", (e) => {
		e.preventDefault()
	})
	
	win.once('ready-to-show', () => {
		win.show()
	})
	
	win.on("closed", () => {
		win = null
	})
})

app.on('window-all-closed', app.quit)

electron.ipcMain.on('open-file-dialog', event => {
	electron.dialog.showOpenDialog({
		properties: ['openDirectory']
	},
	files => {
		if (files) event.sender.send('selected-directory', files)
	})
})
