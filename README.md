<h2>This project requires </h2>
* nodejs
* npm
	* express
	* socket.io
	* multer

<h2>Starting the server</h2>

* <strong>npm install</strong> && <strong>npm start</strong> and you're good to go.

<h2>Connecting to the server</h2>

Enter <a href="localhost:3000">localhost:3000</a> in your browser.

<h2>Branch compatibility with browsers :</h2>

<table>
	<tr>
		<th><strong>branch / browser</strong></th>
		<th><strong>Firefox</strong></th>
		<th><strong>Chrome / Chromium / Opera</strong></th>
	</tr>
	<tr>
		<td>master</td>
		<td>Yes</td>
		<td>Yes</td>
	</tr>
	<tr>
		<td>server</td>
		<td>Yes</td>
		<td>Yes</td>
	</tr>
	<tr>
		<td>local</td>
		<td>Yes</td>
		<td>No</td>
	</tr>
</table>


NB : Here the master branch is just a merge from the server branch, so using the server branch is equivalent to using the master branch.
The <strong>local</strong> branch is an alternative version of the application that is meant to be used locally which could be useful when no internet connection is available.

This server is for rendering midi files.

<h2>How does it work</h2>

* When a client uploads to the server via a POST request, his remote address is linked to the file he uploaded
* After the post request has ended, the client reconnects
* Upon reconnection of a client, the server checks this client's uploaded file and sends it to him if he has one.