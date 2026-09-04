import {handleTourazPreview} from '@/lib/touraz-download';
export async function POST(request:Request){return handleTourazPreview(request);}
