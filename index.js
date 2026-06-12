import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {z} from 'zod';
const BASE_URL="https://api.github.com";
//create the server
const server = new McpServer({
    name:'github-status-server',
    version: '1.0.0',
})

//defining tools
server.tool(
    "get-repo-stats",
    "Get star count, fork count, and open issue for a Github repo",
    {
        owner: z.string().describe("Github username or organization, e.g. 'gaurav101'"),
        repo: z.string().describe("Repository name, e.g. 'luminajs'"),
    },
    async ({owner,repo})=>{
        const response=await fetch(`${BASE_URL}/repos/${owner}/${repo}`);
        if(!response.ok){
            return {
                content:[
                    {type:'text',text:`Cound not find repo #${owner}/${repo}}`}
                ]
            }
        }
        const data=await response.json();
        return {
            content:[
                {type:'text',text:`${owner}/${repo} - ⭐️ ${data.stargazers_count} stars,  🍴 ${data.forks_count} fork count , 🐛 ${data.open_issues_count} open issues`,}
            ]
        }
    }
);
//start the server using stdio
const transport=new StdioServerTransport();
await server.connect(transport);