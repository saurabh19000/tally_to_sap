import com.sap.gateway.ip.core.customdev.util.Message
import groovy.json.JsonOutput

Message processData(Message message) {
    def body = message.getBody(String)
    if (!body || body.trim().isEmpty()) {
        body = "No data found"
    }

    def output = [message: body]

    message.setHeader("Content-Type", "application/json")
    message.setBody(JsonOutput.toJson(output))
    return message
}