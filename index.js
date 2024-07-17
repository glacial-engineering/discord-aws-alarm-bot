const { REST, Routes } = require("discord.js");
const { CloudWatchClient, DescribeAlarmsCommand } = require("@aws-sdk/client-cloudwatch");

const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const REGION = process.env.AWS_REGION;

exports.handler = async function (_event, _context, _callback) {
    const client = new CloudWatchClient({ region: REGION });
    const command = new DescribeAlarmsCommand({
        StateValue: "ALARM" || "INSUFFICIENT_DATA",
        
    });
    const response = await client.send(command);
    const alarms = response.MetricAlarms?.filter(a => !a.AlarmName?.includes("TargetTracking"));
    const alarmText = alarms.length === 0 ? "None" : alarms?.map(a => a.AlarmName).join("\n");
    console.log(alarmText);

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    console.log("Looking up existing channel name");
    const channel = await rest.get(Routes.channel(CHANNEL_ID));
    
    const name = channel.name;
    const newName = alarms?.length === 0 ? "AWS🟢" : `AWS🔴${alarms?.length}`;
    if (name != newName) {
        console.log(`Changing channel name from ${name} to ${newName}`);
        await rest.patch(Routes.channel(CHANNEL_ID), {
            body: {
                name: newName,
            }
        });
    }

    const newMessage = {
        content: "_\n**__Active alarms:__**\n" + alarmText,
    }
    const messages = await rest.get(Routes.channelMessages(CHANNEL_ID));
    if (messages.length == 0) {
        console.log("Sending new message");
        await rest.post(Routes.channelMessages(CHANNEL_ID), {
            body: newMessage,
        });
    } else {
        console.log("Updating existing message");
        const messageID = messages[messages.length - 1].id;
        await rest.patch(Routes.channelMessage(CHANNEL_ID, messageID), {
            body: newMessage,
        });
    }
};