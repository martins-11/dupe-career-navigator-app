import { NextResponse } from 'next/server';
// Use require if your service uses module.exports, or import if it uses export default
const { exploreSearchRolesPersonaDriven } = require('@/services/rolesExploreSearchService');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 1. Get the Persona ID from the frontend request
    const personaId = searchParams.get('personaId');
    const query = searchParams.get('title') || searchParams.get('q') || '';

    if (!personaId) {
      console.error("❌ API Route: Missing personaId");
      return NextResponse.json({ error: 'personaId is required' }, { status: 400 });
    }

    console.log(`🚀 API Route: Fetching Bedrock roles for Persona: ${personaId}, Query: ${query}`);

    // 2. Call the service (this is where the AI matching happens)
    const roles = await exploreSearchRolesPersonaDriven({
      q: query,
      personaId: personaId,
      limit: 6
    });

    // 3. Return the real roles found by Bedrock
    return NextResponse.json(roles);
    
  } catch (error: any) {
    console.error("❌ API Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}