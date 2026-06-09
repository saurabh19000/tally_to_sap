import com.sap.gateway.ip.core.customdev.util.Message
import groovy.json.JsonOutput
import groovy.json.JsonSlurper

def Message processData(Message message) {

    def json = new JsonSlurper().parse(message.getBody(java.io.Reader))

    def request = [
        company      : json.company,
        dataType     : json.dataType ?: "Ledgers",
        cpiMessageId : message.getHeaders().get("SAP_MessageProcessingLogID") ?: "",
        totalRecords : json.totalRecords ?: 0,
        summary      : json.summary ?: [:],
        data         : json.data ?: []
    ]

    message.setBody(JsonOutput.toJson(request))
    message.setHeader("Content-Type", "application/json")

    return message
}