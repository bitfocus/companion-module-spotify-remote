## A module for controlling spotify via the Web API.

### Setup

Go to [here](https://developer.spotify.com/dashboard/applications) and create an application.  
Copy the Client ID and Client Secret and add them to the config boxes.  
Fill in the Base URL field, to match how you are accessing Companion.  
Press save.

Reopen the settings, and copy the Redirect URL. Set it in the spotify application you created.
Click the Authenticate link in the settings, and follow the instructions provided.  
When prompted, close the window/tab, and check that the module is now reporting as OK.

If you refresh the config, there should be an Access Token and Refresh Token will be wrote to the config.  
Now go assign the "Write the ID of the current Active Device to config" button, start playing music on the device you wish to control and then press the button you just assigned.  
The module is now fully configured and should work without issue.

If you have an issues with the module please open an issue on the module's GitHub repo on the official Slack.
