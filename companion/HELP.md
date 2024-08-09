## A module for controlling spotify via the Web API.

### Setup

1. Go to [here](https://developer.spotify.com/dashboard/applications) and create an application.
2. Copy the Client ID and Client Secret and add them to the config boxes. Set the application to use the Redirect URL shown.
3. Save the module config
4. Reopen the module config, copy the 'Auth URL' and open it in your browser
5. Follow through the process
6. Once you are greeted with a page reporting 'Success', you can close the tab, and the module status will now be green.

If the module status changes due to it being unable to authenticate, navigate to the 'Auth URL' again, and repeat the remaining steps of the process.

Now go assign the "Write the ID of the current Active Device to config" button, start playing music on the device you wish to control and then press the button you just assigned.  
The module is now fully configured and should work without issue.

If you have an issues with the module please open an issue on the module's GitHub repo or message Peter Stather on the official Slack.

## Old Method

In previous versions, the process was a bit more manual, involving changing the Redirect URL. This still works but is no longer necessary.

1. Set https://spotauth.github.io/ as your Redirect URL both in the Config and on the spotify application you created.
2. Save the config
3. Reopen the module config, copy the 'Auth URL' and open it in your browser
4. Follow through the process
5. Copy the code provided into the 'Approval Code' field (This is hidden behind the 'Show secrets' toggle)
