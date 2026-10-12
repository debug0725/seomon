const retired=()=>Response.json({error:'협동 레이드는 종료되었습니다. 첫 의뢰에서 혼자 플레이해 주세요.'},{status:410,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export const GET=retired;
export const POST=retired;
