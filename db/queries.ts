import { and, asc, desc, eq } from 'drizzle-orm';
import { getDb } from './index';
import { bookmarks, institutions, noticeReviews, notices, sourceChecks, sources } from './schema';
import publicRegistry from '../data/public-institutions.json';
import {centralCollectors} from '../lib/central-collectors';
import {kiatSource,nipaSource,keitiSource,kosmeSource} from '../lib/public-collectors';
import {koatSource} from '../lib/koat-collector';
import {socialenterpriseSource} from '../lib/socialenterprise-collector';
import {arkoSource} from '../lib/arko-collector';
import {kawfSource} from '../lib/kawf-collector';
import {kinfaSource} from '../lib/kinfa-collector';
import {semasSource} from '../lib/semas-collector';
import {tourazSource} from '../lib/touraz-download';
import {registerCentralInstitutions} from './central-institutions';

const now = new Date('2026-09-01T14:00:00.000Z');
const seedInstitutions = [
  { id: 'msit', name: '과학기술정보통신부', group: '중앙부처', officialDomain: 'msit.go.kr', parentId: null, createdAt: now },
  { id: 'mss', name: '중소벤처기업부', group: '중앙부처', officialDomain: 'mss.go.kr', parentId: null, createdAt: now },
  { id: 'gb', name: '경상북도', group: '지방자치단체', officialDomain: 'gb.go.kr', parentId: null, createdAt: now },
  { id: 'moe', name: '교육부', group: '중앙부처', officialDomain: 'moe.go.kr', parentId: null, createdAt: now },
  { id: 'mcst', name: '문화체육관광부', group: '중앙부처', officialDomain: 'mcst.go.kr', parentId: null, createdAt: now },
  { id: 'mois', name: '행정안전부', group: '중앙부처', officialDomain: 'mois.go.kr', parentId: null, createdAt: now },
  { id: 'me', name: '기후에너지환경부', group: '중앙부처', officialDomain: 'me.go.kr', parentId: null, createdAt: now },
  { id: 'seoul', name: '서울특별시', group: '지방자치단체', officialDomain: 'seoul.go.kr', parentId: null, createdAt: now },
  { id: 'busan', name: '부산광역시', group: '지방자치단체', officialDomain: 'busan.go.kr', parentId: null, createdAt: now },
  { id: 'incheon', name: '인천광역시', group: '지방자치단체', officialDomain: 'incheon.go.kr', parentId: null, createdAt: now },
  { id: 'daejeon', name: '대전광역시', group: '지방자치단체', officialDomain: 'daejeon.go.kr', parentId: null, createdAt: now },
  { id: 'daegu', name: '대구광역시', group: '지방자치단체', officialDomain: 'daegu.go.kr', parentId: null, createdAt: now },
  { id: 'ulsan', name: '울산광역시', group: '지방자치단체', officialDomain: 'ulsan.go.kr', parentId: null, createdAt: now },
  { id: 'jeonbuk', name: '전북특별자치도', group: '지방자치단체', officialDomain: 'jeonbuk.go.kr', parentId: null, createdAt: now },
  { id: 'gyeongnam', name: '경상남도', group: '지방자치단체', officialDomain: 'gyeongnam.go.kr', parentId: null, createdAt: now },
  { id: 'chungbuk', name: '충청북도', group: '지방자치단체', officialDomain: 'chungbuk.go.kr', parentId: null, createdAt: now },
  { id: 'jeju', name: '제주특별자치도', group: '지방자치단체', officialDomain: 'jeju.go.kr', parentId: null, createdAt: now },
];
const seedSources = [
  {...tourazSource,method:'official-public-csv',cadenceMinutes:1440,status:'ready',lastSuccessAt:null,createdAt:now},
  {...kosmeSource,method:'public-institution-support-board',cadenceMinutes:180,status:'ready',lastSuccessAt:null,createdAt:now},
  {...koatSource,method:'public-institution-support-board',cadenceMinutes:180,status:'ready',lastSuccessAt:null,createdAt:now},
  {...socialenterpriseSource,method:'official-public-json',cadenceMinutes:180,status:'ready',lastSuccessAt:null,createdAt:now},
  {...arkoSource,method:'public-institution-support-board',cadenceMinutes:180,status:'ready',lastSuccessAt:null,createdAt:now},
  {...kawfSource,method:'public-institution-support-board',cadenceMinutes:180,status:'ready',lastSuccessAt:null,createdAt:now},
  {...kinfaSource,method:'public-institution-support-board',cadenceMinutes:180,status:'ready',lastSuccessAt:null,createdAt:now},
  {...semasSource,method:'official-policy-loan-notice',cadenceMinutes:180,status:'ready',lastSuccessAt:null,createdAt:now},
  {...kiatSource,method:'public-institution-support-board',cadenceMinutes:180,status:'ready',lastSuccessAt:null,createdAt:now},
  {...nipaSource,method:'public-institution-support-board',cadenceMinutes:180,status:'ready',lastSuccessAt:null,createdAt:now},
  {...keitiSource,method:'public-institution-support-board',cadenceMinutes:180,status:'ready',lastSuccessAt:null,createdAt:now},
  ...centralCollectors.map(c=>({id:c.id,institutionId:c.institutionId,name:c.name,url:c.url,method:'institution-board',cadenceMinutes:180,status:'ready',lastSuccessAt:null,createdAt:now})),
  { id:'bizinfo', institutionId:'mss', name:'기업마당', url:'https://www.bizinfo.go.kr/sii/siia/selectSIIA200View.do', method:'official-index', cadenceMinutes:60, status:'connected', lastSuccessAt:now, createdAt:now },
  { id:'bojo', institutionId:null, name:'보조금통합포털', url:'https://www.bojo.go.kr/retrieveSearchPubBiz.do', method:'official-index', cadenceMinutes:60, status:'connected', lastSuccessAt:now, createdAt:now },
  { id:'moe-board', institutionId:'moe', name:'교육부 사업공고', url:'https://www.moe.go.kr/boardCnts/listRenew.do?boardID=72761&m=020502&s=moe', method:'institution-board', cadenceMinutes:180, status:'connected', lastSuccessAt:now, createdAt:now },
  { id:'gov24-orgs', institutionId:null, name:'정부24 기관 누리집', url:'https://www.gov.kr/portal/orgSite', method:'registry', cadenceMinutes:1440, status:'connected', lastSuccessAt:now, createdAt:now },
  { id:'mcst-board', institutionId:'mcst', name:'문화체육관광부 공지', url:'https://www.mcst.go.kr/site/s_notice/notice/noticeList.jsp?pCurrentPage=1', method:'institution-board', cadenceMinutes:180, status:'ready', lastSuccessAt:null, createdAt:now },
  { id:'mois-board', institutionId:'mois', name:'행정안전부 알립니다', url:'https://www.mois.go.kr/frt/bbs/type013/commonSelectBoardList.do?bbsId=BBSMSTR_000000000006', method:'institution-board', cadenceMinutes:180, status:'ready', lastSuccessAt:null, createdAt:now },
  { id:'me-board', institutionId:'me', name:'기후에너지환경부 공지·공고', url:'https://me.go.kr/home/web/board/list.do?boardMasterId=39&menuId=10524&maxPageItems=20&order=DCREATE_DATE', method:'institution-board', cadenceMinutes:180, status:'ready', lastSuccessAt:null, createdAt:now },
  { id:'seoul-board', institutionId:'seoul', name:'서울특별시 고시·공고', url:'https://www.seoul.go.kr/news/news_notice.do?selmenu=M00000107', method:'local-government-board', cadenceMinutes:180, status:'ready', lastSuccessAt:null, createdAt:now },
  { id:'busan-board', institutionId:'busan', name:'부산광역시 고시공고', url:'https://www.busan.go.kr/nbgosi', method:'local-government-board', cadenceMinutes:180, status:'ready', lastSuccessAt:null, createdAt:now },
  { id:'incheon-board', institutionId:'incheon', name:'인천광역시 고시공고', url:'https://www.incheon.go.kr/IC010307/list?curPage=1', method:'local-government-board', cadenceMinutes:180, status:'ready', lastSuccessAt:null, createdAt:now },
  { id:'daejeon-board', institutionId:'daejeon', name:'대전광역시 공모·모집', url:'https://www.daejeon.go.kr/online/recruitmentNoticeList.do', method:'local-government-board', cadenceMinutes:180, status:'ready', lastSuccessAt:null, createdAt:now },
  { id:'daegu-board', institutionId:'daegu', name:'대구광역시 공모·모집', url:'https://minwon.daegu.go.kr/pssrp/list', method:'local-government-board', cadenceMinutes:180, status:'ready', lastSuccessAt:null, createdAt:now },
  { id:'ulsan-board', institutionId:'ulsan', name:'울산광역시 고시공고', url:'https://www.ulsan.go.kr/u/rep/transfer/notice/list.ulsan?mId=001004002000000000', method:'local-government-board', cadenceMinutes:180, status:'ready', lastSuccessAt:null, createdAt:now },
  { id:'jeonbuk-board', institutionId:'jeonbuk', name:'전북특별자치도 공고·고시', url:'https://www.jeonbuk.go.kr/board/list.jeonbuk?boardId=BBS_0000129&menuCd=DOM_000000102002005000&orderBy=REGISTER_DATE%3ADESC%2CTMP_FIELD1%3ADESC&paging=ok&startPage=1', method:'local-government-board', cadenceMinutes:180, status:'ready', lastSuccessAt:null, createdAt:now },
  { id:'gyeongnam-business', institutionId:'gyeongnam', name:'경남기업119 지원사업', url:'https://www.gyeongnam.go.kr/giup/index.gyeong', method:'local-government-support-portal', cadenceMinutes:180, status:'ready', lastSuccessAt:null, createdAt:now },
  { id:'chungbuk-board', institutionId:'chungbuk', name:'충청북도 고시·공고', url:'https://www.chungbuk.go.kr/www/selectGosiPblancList.do?key=422&pageIndex=1&pageUnit=20&searchCnd=all', method:'local-government-board', cadenceMinutes:180, status:'ready', lastSuccessAt:null, createdAt:now },
  { id:'jeju-board', institutionId:'jeju', name:'제주특별자치도 공고', url:'https://www.jeju.go.kr/tool/sido/api.jsp?act=index&page=1', method:'official-json-index', cadenceMinutes:180, status:'ready', lastSuccessAt:null, createdAt:now },
  { id:'kocca-support', institutionId:'public-198', name:'한국콘텐츠진흥원 지원공고', url:'https://www.kocca.kr/kocca/pims/list.do?menuNo=204104', method:'public-institution-support-board', cadenceMinutes:180, status:'ready', lastSuccessAt:null, createdAt:now },
];
const publicInstitutionSeeds = publicRegistry.items.map((item,index)=>({
  id:`public-${String(index+1).padStart(3,'0')}`,
  name:item.name,
  group:'공사·공단',
  officialDomain:null,
  parentId:item.parent,
  createdAt:now,
}));
const seedNotices = [
  ['govtech-2026','bizinfo','52','과학기술정보통신부','중앙부처','2026년 GovTech 창업 경진대회 모집 공고','창업','기업·예비창업자','기업마당','2026.09.21','2026-09-21T14:59:00+09:00'],
  ['export-logistics-2026','bizinfo','857','중소벤처기업부','중앙부처','2026년 2차 온라인수출 중소기업 물류 지원 사업','수출','중소기업','기업마당','2026.09.16','2026-09-16T18:00:00+09:00'],
  ['andong-healingroad-2026','bojo','gb-andong-2026','경상북도','지방자치단체','2026 안동 낙동강 힐링로드 보조사업 지원신청 공모','지역','기관·단체','보조금통합포털','2026.09.14','2026-09-14T18:00:00+09:00'],
  ['open-innovation-2026','bizinfo','48','중소벤처기업부','중앙부처','민관협력 오픈이노베이션 지원 창업기업 모집','기술','창업기업','기업마당','2026.09.09','2026-09-09T18:00:00+09:00'],
  ['school-complex-2026','moe-board','3554','교육부','중앙부처','2026년 제2차 학교복합시설 공모사업','교육','지방자치단체','교육부','공고문 확인',null],
] as const;

export async function ensureSeeded() {
  const db = getDb();
  await registerCentralInstitutions();
  for(let offset=0;offset<seedInstitutions.length;offset+=8) {
    await db.insert(institutions).values(seedInstitutions.slice(offset,offset+8)).onConflictDoNothing();
  }
  const registrySentinel=publicInstitutionSeeds.at(-1)!;
  const registryReady=(await db.select({id:institutions.id}).from(institutions).where(eq(institutions.id,registrySentinel.id)).limit(1)).length>0;
  if(!registryReady) for(let offset=0;offset<publicInstitutionSeeds.length;offset+=8) {
    await db.insert(institutions).values(publicInstitutionSeeds.slice(offset,offset+8)).onConflictDoNothing();
  }
  // D1 limits the number of bound parameters in one statement. Keep source
  // seeding below that ceiling as the registry grows.
  for(let offset=0;offset<seedSources.length;offset+=8) {
    await db.insert(sources).values(seedSources.slice(offset,offset+8)).onConflictDoNothing();
  }
  for (const n of seedNotices) {
    await db.insert(notices).values({
      id:n[0], sourceId:n[1], externalId:n[2], institution:n[3], group:n[4], title:n[5], summary:null,
      category:n[6], audience:n[7], region:null, sourceName:n[8], sourceUrl:seedSources.find(s=>s.id===n[1])!.url,
      applicationUrl:null, opensAt:null, closesAt:n[10] ? new Date(n[10]) : null, deadlineLabel:n[9], status:'open',
      contentHash:`seed-${n[0]}-v1`, verifiedAt:now, createdAt:now, updatedAt:now,
    }).onConflictDoNothing();
  }
}

export async function listNotices(includeClosed=false) {
  await ensureSeeded();
  return getDb().select().from(notices).where(includeClosed?undefined:eq(notices.status, 'open')).orderBy(asc(notices.closesAt));
}

export async function listSources() {
  await ensureSeeded();
  return getDb().select().from(sources).orderBy(asc(sources.name));
}

export async function listBookmarks(deviceKey:string) {
  await ensureSeeded();
  return getDb().select({ noticeId: bookmarks.noticeId }).from(bookmarks).where(eq(bookmarks.deviceKey, deviceKey));
}

export async function setBookmark(deviceKey:string, noticeId:string, saved:boolean) {
  await ensureSeeded();
  const db=getDb();
  if(saved) await db.insert(bookmarks).values({ deviceKey, noticeId, createdAt:new Date() }).onConflictDoNothing();
  else await db.delete(bookmarks).where(and(eq(bookmarks.deviceKey, deviceKey),eq(bookmarks.noticeId,noticeId)));
}

export async function listRecentChecks() {
  await ensureSeeded();
  return getDb().select().from(sourceChecks).orderBy(desc(sourceChecks.finishedAt)).limit(40);
}

export async function listNoticeReviews() {
  await ensureSeeded();
  return getDb().select().from(noticeReviews).orderBy(desc(noticeReviews.updatedAt));
}

export async function setNoticeReview(noticeId:string,decision:'approved'|'excluded',note:string|null) {
  await ensureSeeded();
  await getDb().insert(noticeReviews).values({noticeId,decision,note,updatedAt:new Date()}).onConflictDoUpdate({target:noticeReviews.noticeId,set:{decision,note,updatedAt:new Date()}});
}
