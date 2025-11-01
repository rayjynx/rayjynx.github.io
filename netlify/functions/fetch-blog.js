const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

exports.handler = async (event, context) => {
  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      filter: { property: 'Published', checkbox: { equals: true }},
      sorts: [{ property: 'Date', direction: 'descending' }]
    });

    const posts = response.results.map(post => ({
      title: post.properties.Title?.title[0]?.plain_text || 'Untitled',
      slug: post.properties.Slug?.rich_text[0]?.plain_text || '',
      date: post.properties.Date?.date?.start || '',
      tags: post.properties.Tags?.multi_select?.map(tag => tag.name) || []
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(posts),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
