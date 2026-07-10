'use strict';
/* ══ Bộ tranh role SVG – phong cách gothic silhouette ══
   22 scene 200×300, dùng trong thẻ vai (player.html) và preview.
   window.ROLE_ART = { roleId: '<svg...>' }                        */
(function(){
const SIL='#0a0718', SIL2='#130d28', M='#e6dcc0', MC='#d5c9a8', ST='#cfc6e8';
const R='#e04b5e', RD='#8b1e2d', G='#c9a55c', GR='#6db573', CY='#9cc7d8', AMB='#e0a84c', STEEL='#b9c0d6', PALE='#dcd7ea', VIO='#a89ede';
const BG_V='#171233', BG_W='#1a0f2e', BG_T='#131b2c', BG_C='#151a33';

const svg=(bg,inner)=>`<svg viewBox="0 0 200 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="200" height="300" fill="${bg}"/>${inner}</svg>`;
const stars=(...p)=>p.map(([x,y,r],i)=>`<circle class="ra-star ra-s${i%3}" cx="${x}" cy="${y}" r="${r||1}" fill="${ST}" opacity="0.85"/>`).join('');
const fog=(cx,cy,rx,o)=>`<ellipse class="ra-fog" cx="${cx}" cy="${cy}" rx="${rx}" ry="11" fill="#0d0920" opacity="${o||0.6}"/>`;
const moon=(x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r*1.6}" fill="#221b48"/><circle cx="${x}" cy="${y}" r="${r*1.28}" fill="#2b2358"/><circle cx="${x}" cy="${y}" r="${r}" fill="${M}"/><circle cx="${x-r*0.3}" cy="${y-r*0.25}" r="${r*0.13}" fill="${MC}"/><circle cx="${x+r*0.28}" cy="${y+r*0.2}" r="${r*0.2}" fill="${MC}"/>`;
const crescent=(bg,x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${M}"/><circle cx="${x+r*0.42}" cy="${y-r*0.28}" r="${r*0.92}" fill="${bg}"/>`;
const glow=(x,y,r,c1,c2,c3)=>`<circle cx="${x}" cy="${y}" r="${r*2.1}" fill="${c1}"/><circle cx="${x}" cy="${y}" r="${r*1.4}" fill="${c2}"/><circle cx="${x}" cy="${y}" r="${r}" fill="${c3}"/>`;
const sparkle=(x,y,s)=>`<path d="M${x} ${y-s*2} l${s*0.5} ${s*1.5} ${s*1.5} ${s*0.5} -${s*1.5} ${s*0.5} -${s*0.5} ${s*1.5} -${s*0.5} -${s*1.5} -${s*1.5} -${s*0.5} ${s*1.5} -${s*0.5} z" fill="#e8f4f7"/>`;
const bat=(x,y,s)=>`<path d="M${x} ${y} q${s} ${-s*1.5} ${s*2} 0 q${s} ${-s*1.5} ${s*2} 0 l${-s*2} ${s*1.2} z" fill="${SIL}"/>`;
const ridge=(y)=>`<path d="M0 ${y} L40 ${y-24} L88 ${y-6} L138 ${y-30} L200 ${y-8} L200 300 L0 300 Z" fill="#120d26"/>`;
const hood=(x,y,s,fill)=>`<path d="M${x} ${y} C${x-26*s} ${y+10*s} ${x-36*s} ${y+32*s} ${x-38*s} ${y+58*s} C${x-48*s} ${y+110*s} ${x-54*s} ${y+160*s} ${x-62*s} ${y+220*s} L${x+62*s} ${y+220*s} C${x+54*s} ${y+160*s} ${x+48*s} ${y+110*s} ${x+38*s} ${y+58*s} C${x+36*s} ${y+32*s} ${x+26*s} ${y+10*s} ${x} ${y} Z" fill="${fill||SIL}"/>`;

const A={};

A.wolf = svg(BG_W,
  stars([28,36,1.2],[168,26,1],[146,58,1.2],[20,84,1],[182,104,1],[56,20,1])
  +moon(100,92,42)
  +bat(30,42,5)+bat(146,26,4)
  +ridge(232)
  +`<path d="M74 226 C79 200 88 189 95 173 C98 160 105 153 114 149 L121 130 L128 140 L140 145 L130 153 C131 165 125 174 118 182 C132 197 140 212 138 226 Z" fill="${SIL}"/>`
  +`<circle cx="121" cy="143" r="1.6" fill="${R}"/>`
  +`<path d="M170 236 L170 184 M170 196 L156 178 M170 204 L184 184 M156 178 L149 167 M184 184 L191 173" stroke="${SIL}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
  +fog(52,286,58)+fog(150,292,54));

A.whitewolf = svg(BG_C,
  stars([24,30,1],[172,44,1.2],[60,58,1],[140,20,1])
  +crescent(BG_C,158,44,20)
  +[[18,96],[64,74],[112,120],[36,150],[160,132],[88,44],[142,168],[52,196]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.4" fill="#ffffff" opacity="0.75"/>`).join('')
  +`<path d="M148 206 l10 -6 5 3 8 -4 5 3 9 -5 -3 8 -24 8 z" fill="${SIL2}"/>`
  +ridge(240)
  +`<path d="M38 234 L44 210 C52 200 66 197 80 196 L106 194 L116 182 L124 189 L136 192 L126 199 L122 208 C114 215 104 217 94 217 L90 234 L80 234 L78 221 L60 221 L56 234 Z" fill="${PALE}"/>`
  +`<circle cx="119" cy="191" r="1.7" fill="${R}"/>`
  +fog(100,288,80,0.5));

A.wolfcub = svg(BG_W,
  stars([30,30,1],[170,40,1.2],[120,22,1])
  +crescent(BG_W,42,44,18)
  +`<path d="M60 60 C90 46 130 50 168 70 C186 82 196 100 198 118 L198 60 L60 60 Z" fill="${SIL2}" opacity="0.75"/>`
  +`<path d="M30 300 C30 210 74 176 100 176 C126 176 170 210 170 300 Z" fill="#0d0a1c"/>`
  +`<path d="M62 300 C62 236 82 214 100 214 C118 214 138 236 138 300 Z" fill="#050310"/>`
  +`<path d="M86 262 C86 246 90 236 96 232 L94 222 L102 228 L110 226 L108 234 C114 240 116 250 115 262 Z" fill="${SIL}"/>`
  +`<circle cx="98" cy="240" r="3.4" fill="${RD}"/><circle cx="108" cy="240" r="3.4" fill="${RD}"/>`
  +`<circle cx="98" cy="240" r="1.6" fill="${R}"/><circle cx="108" cy="240" r="1.6" fill="${R}"/>`
  +fog(100,292,86,0.55));

A.fakewolf = svg(BG_W,
  stars([26,34,1],[176,28,1.2],[152,64,1])
  +crescent(BG_W,164,40,17)
  +hood(100,84,1,SIL)
  +`<path d="M84 92 L78 70 L94 84 Z M116 92 L122 70 L106 84 Z" fill="${SIL}"/>`
  +`<ellipse cx="100" cy="116" rx="15" ry="18" fill="#050310"/>`
  +`<circle cx="94" cy="116" r="2" fill="${R}"/><circle cx="106" cy="116" r="2" fill="${R}"/>`
  +glow(146,206,5,'#3a2a18','#8a6234',AMB)
  +`<rect x="142" y="192" width="8" height="6" fill="${SIL}"/><path d="M139 198 h14 v14 a7 7 0 0 1 -14 0 z" fill="none" stroke="${SIL}" stroke-width="2.4"/>`
  +`<path d="M160 292 C176 286 186 272 182 258 C179 248 170 244 162 248 C170 252 173 260 169 268 C165 276 158 282 150 286 Z" fill="${SIL}"/>`
  +fog(60,290,66));

A.hunterwolf = svg(BG_W,
  stars([170,30,1.2],[28,52,1],[140,18,1])
  +crescent(BG_W,36,42,16)
  +`<path d="M138 76 L138 190 M138 76 L182 76 M174 76 L174 96" stroke="#2c2447" stroke-width="5" fill="none"/>`
  +`<ellipse cx="174" cy="104" rx="7" ry="9" fill="none" stroke="#2c2447" stroke-width="3"/>`
  +hood(96,110,0.9,SIL)
  +`<path d="M96 110 L88 88 L100 102 Z M104 104 L114 90 L108 108 Z" fill="${SIL}"/>`
  +`<path d="M96 118 L112 124 L96 128 Z" fill="${SIL}"/>`
  +`<circle cx="94" cy="116" r="1.8" fill="${R}"/>`
  +`<path d="M46 262 C58 240 78 236 92 244" stroke="${STEEL}" stroke-width="2.2" fill="none"/>`
  +`<path d="M64 250 L84 262" stroke="${STEEL}" stroke-width="1.6"/>`
  +fog(100,292,84,0.55));

A.minion = svg(BG_W,
  stars([32,28,1],[168,36,1.2],[104,20,1])
  +`<circle cx="146" cy="112" r="34" fill="${SIL2}" opacity="0.8"/>`
  +`<circle cx="136" cy="108" r="3" fill="${R}"/><circle cx="152" cy="108" r="3" fill="${R}"/>`
  +`<circle cx="128" cy="152" r="2.2" fill="${R}" opacity="0.7"/><circle cx="140" cy="152" r="2.2" fill="${R}" opacity="0.7"/>`
  +`<path d="M42 300 C42 262 50 236 62 222 C68 214 78 210 84 212 L88 200 C82 196 80 188 84 182 C88 176 96 176 100 182 C104 188 102 196 96 200 L96 212 C104 220 108 234 108 244 L120 238 L124 246 L104 258 C100 274 98 288 98 300 Z" fill="${SIL}"/>`
  +`<path d="M118 236 L134 228 L138 234 L122 242 Z" fill="${STEEL}"/>`
  +fog(120,292,70));

A.villager = svg(BG_V,
  stars([170,34,1.2],[28,28,1],[142,60,1],[60,44,1])
  +crescent(BG_V,42,48,17)
  +`<path d="M0 208 L0 168 L26 168 L26 148 L38 132 L50 148 L50 208 Z M60 208 L60 156 L92 156 L92 208 Z M150 208 L150 160 L184 160 L184 208 Z M110 208 L110 120 L118 104 L126 120 L126 208 Z" fill="${SIL2}"/>`
  +`<rect x="0" y="204" width="200" height="96" fill="#120d26"/>`
  +hood(100,138,0.85,SIL)
  +glow(70,208,5,'#33261c','#8a6234',AMB)
  +`<path d="M66 194 h9 v6 h-9 z" fill="${SIL}"/><path d="M64 200 h13 v16 a6.5 6.5 0 0 1 -13 0 z" fill="none" stroke="${SIL}" stroke-width="2.6"/>`
  +fog(120,290,80,0.55));

A.seer = svg(BG_V,
  stars([28,32,1.2],[172,42,1],[148,20,1.2],[48,70,1],[184,86,1],[18,116,1],[186,146,1])
  +crescent(BG_V,36,34,13)
  +`<circle cx="100" cy="186" r="86" fill="#1f1943"/>`
  +sparkle(100,74,4)
  +hood(100,96,1.05,'#0c0920')
  +`<ellipse cx="100" cy="132" rx="17" ry="22" fill="#050310"/>`
  +glow(100,212,15,'#263c56','#3e6a86','#9cc7d8')+`<circle cx="100" cy="212" r="6" fill="#e8f4f7"/>`
  +sparkle(100,168,3)+sparkle(134,190,2.2)
  +`<ellipse cx="74" cy="228" rx="13" ry="8" fill="#0c0920"/><ellipse cx="126" cy="228" rx="13" ry="8" fill="#0c0920"/>`
  +fog(100,288,86,0.7));

A.apprenticeseer = svg(BG_V,
  stars([30,30,1],[168,26,1.2],[186,70,1],[22,92,1])
  +crescent(BG_V,166,42,15)
  +`<path d="M28 300 C24 262 30 238 44 226 C52 220 62 220 68 226 L64 238 C56 236 48 242 46 254 C42 272 40 286 40 300 Z" fill="#0c0920" opacity="0.85"/>`
  +`<rect x="112" y="220" width="44" height="14" fill="${SIL2}"/><rect x="120" y="234" width="28" height="46" fill="${SIL2}"/>`
  +glow(134,204,11,'#1e2f42','#2c4a5e','#6d97ab')
  +`<path d="M126 198 L133 206 L130 212 L138 204" stroke="#101c28" stroke-width="1.6" fill="none"/>`
  +hood(74,158,0.62,SIL)
  +`<path d="M92 196 C102 194 112 198 120 204 L116 212 C108 206 100 204 92 204 Z" fill="${SIL}"/>`
  +fog(90,290,80,0.6));

A.witch = svg(BG_T,
  stars([26,24,1.2],[90,18,1],[60,44,1],[16,120,1],[186,140,1])
  +crescent(BG_T,150,44,22)
  +`<path d="M56 64 C52 88 46 106 40 124 L76 124 C66 106 60 88 56 64 Z" fill="#0a0f1e"/>`
  +`<ellipse cx="58" cy="124" rx="28" ry="6" fill="#0a0f1e"/>`
  +`<path d="M30 300 C32 252 38 202 46 162 C48 148 52 138 59 130 L64 134 C72 146 76 164 78 182 C82 222 86 258 88 300 Z" fill="#0a0f1e"/>`
  +`<path d="M72 186 C86 188 98 194 108 202 L103 212 C93 203 82 198 70 196 Z" fill="#0a0f1e"/>`
  +`<path d="M94 226 C94 206 158 206 158 226 C158 250 142 264 126 264 C110 264 94 250 94 226 Z" fill="#0a0f1e"/>`
  +`<ellipse cx="126" cy="211" rx="33" ry="9" fill="#0a0f1e"/><ellipse cx="126" cy="211" rx="27" ry="6" fill="#4c8a52"/>`
  +`<circle cx="116" cy="192" r="3.2" fill="${GR}"/><circle cx="132" cy="180" r="4" fill="${GR}"/><circle cx="122" cy="166" r="2.6" fill="${GR}" opacity="0.8"/><circle cx="140" cy="152" r="3" fill="${GR}" opacity="0.6"/>`
  +`<rect x="106" y="262" width="5" height="16" fill="#0a0f1e"/><rect x="142" y="262" width="5" height="16" fill="#0a0f1e"/>`
  +`<path d="M108 280 l7 -14 6 14 z M122 284 l8 -17 7 17 z M140 280 l7 -13 6 13 z" fill="#b3542e"/>`
  +`<path d="M116 282 l5 -9 4 9 z M132 284 l5 -11 5 11 z" fill="#d8823c"/>`
  +fog(50,292,56,0.65));

A.bodyguard = svg(BG_V,
  stars([170,30,1.2],[30,40,1],[146,60,1])
  +crescent(BG_V,38,44,15)
  +`<path d="M138 158 L138 132 L150 118 L162 132 L162 158 Z" fill="${SIL2}"/>`
  +`<path d="M100 96 C112 96 120 106 120 118 L120 128 L80 128 L80 118 C80 106 88 96 100 96 Z" fill="${SIL}"/>`
  +`<path d="M62 300 C62 220 74 168 100 160 C126 168 138 220 138 300 Z" fill="${SIL}"/>`
  +`<path d="M100 156 L142 170 L142 226 C142 258 124 280 100 292 C76 280 58 258 58 226 L58 170 Z" fill="#1c1740" stroke="${STEEL}" stroke-width="2"/>`
  +`<path d="M100 176 L100 268 M74 210 L126 210" stroke="${STEEL}" stroke-width="2.4"/>`
  +fog(100,294,88,0.5));

A.doctor = svg(BG_T,
  stars([32,26,1.2],[168,38,1],[142,18,1])
  +crescent(BG_T,164,46,16)
  +`<ellipse cx="86" cy="92" rx="35" ry="8" fill="${SIL}"/>`
  +`<path d="M64 92 C64 74 108 74 108 92 Z" fill="${SIL}"/>`
  +`<path d="M78 100 C70 104 62 112 56 122 L74 118 C80 110 84 104 86 100 Z" fill="${SIL}"/>`
  +`<path d="M86 98 C74 104 68 116 66 128 L60 124 C50 120 42 122 38 128 C46 128 52 132 56 138 L70 136 C80 132 88 122 92 110 Z" fill="${SIL}"/>`
  +`<circle cx="76" cy="106" r="2.6" fill="#3b3260"/>`
  +`<path d="M44 300 C44 240 56 178 86 122 C112 168 122 236 122 300 Z" fill="${SIL}"/>`
  +`<path d="M112 190 C124 190 134 196 142 206 L136 214 C128 206 120 202 110 202 Z" fill="${SIL}"/>`
  +glow(150,224,8,'#152b28','#20514a','#63b0a8')
  +`<path d="M146 208 h8 v8 l7 14 a4 4 0 0 1 -4 6 h-14 a4 4 0 0 1 -4 -6 l7 -14 z" fill="none" stroke="${STEEL}" stroke-width="1.8"/>`
  +fog(100,292,84,0.55));

A.hunter = svg(BG_V,
  stars([30,30,1],[176,60,1.2],[60,18,1])
  +moon(156,52,26)
  +`<path d="M36 300 C36 250 44 210 60 186 C66 176 76 170 84 172 L88 158 C84 152 84 144 90 140 C96 136 104 138 107 145 C110 152 107 160 100 163 L100 176 C112 184 120 200 122 216 C126 248 128 274 128 300 Z" fill="${SIL}"/>`
  +`<path d="M70 210 C92 168 124 138 152 122" stroke="${SIL}" stroke-width="3" fill="none"/>`
  +`<path d="M70 210 L152 122" stroke="#4b4470" stroke-width="1.2"/>`
  +`<path d="M96 186 L146 132" stroke="${STEEL}" stroke-width="1.8"/>`
  +`<path d="M146 132 L142 142 L152 138 Z" fill="#e0763c"/>`
  +fog(100,292,84,0.55));

A.cupid = svg(BG_V,
  stars([28,28,1.2],[170,22,1],[186,64,1],[16,90,1])
  +`<path d="M58 60 C46 52 30 54 22 66 C34 64 44 68 50 76 Z M142 60 C154 52 170 54 178 66 C166 64 156 68 150 76 Z" fill="${SIL}"/>`
  +`<path d="M74 132 C60 118 60 100 74 92 C84 86 96 90 100 100 C104 90 116 86 126 92 C140 100 140 118 126 132 L100 158 Z" fill="#b3475a"/>`
  +`<path d="M128 196 C120 188 120 178 128 173 C133 170 140 172 142 178 C144 172 151 170 156 173 C164 178 164 188 156 196 L142 210 Z" fill="#8f4a63"/>`
  +`<path d="M100 158 C88 176 96 186 110 190 C124 194 132 202 128 214" stroke="${R}" stroke-width="1.8" fill="none"/>`
  +`<path d="M40 240 C64 216 100 208 136 214" stroke="${STEEL}" stroke-width="2" fill="none"/>`
  +`<path d="M40 240 L136 214" stroke="#4b4470" stroke-width="1"/>`
  +fog(100,288,86,0.6));

A.elder = svg(BG_V,
  stars([168,30,1.2],[30,24,1],[186,88,1])
  +crescent(BG_V,40,42,15)
  +`<path d="M52 300 C52 252 60 214 76 192 C82 182 92 176 100 178 L102 160 C98 154 99 146 105 142 C111 138 119 141 121 148 C123 155 119 162 112 164 L112 178 C124 188 132 208 134 232 C136 256 136 278 136 300 Z" fill="${SIL}"/>`
  +`<path d="M104 176 C104 196 100 212 94 224 L104 228 C110 214 112 196 112 178 Z" fill="#050310"/>`
  +`<path d="M150 300 L150 168 L156 156 L162 168 L162 300 Z" fill="${SIL}"/><circle cx="156" cy="152" r="6" fill="${SIL}"/>`
  +`<path d="M46 150 C42 138 48 128 58 128 C52 136 52 144 56 152 Z" fill="${VIO}" opacity="0.85"/>`
  +`<path d="M148 108 C144 98 150 88 158 88 C153 96 153 102 157 110 Z" fill="${VIO}" opacity="0.65"/>`
  +fog(100,292,84,0.55));

A.mayor = svg(BG_V,
  stars([32,28,1],[170,36,1.2],[140,16,1])
  +crescent(BG_V,166,44,15)
  +`<circle cx="92" cy="112" r="17" fill="${SIL}"/>`
  +`<path d="M74 106 h36 v-6 h-36 z M80 100 h24 v-12 h-24 z" fill="${SIL}"/>`
  +`<path d="M46 300 C46 240 58 190 74 164 L92 156 L110 164 C126 190 138 240 138 300 Z" fill="${SIL}"/>`
  +[[74,176],[82,184],[92,187],[102,184],[110,176]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3" fill="none" stroke="${G}" stroke-width="1.6"/>`).join('')
  +`<circle cx="92" cy="196" r="4.4" fill="${G}"/>`
  +`<path d="M124 158 C134 148 146 142 158 140 L160 150 C148 152 138 158 130 166 Z" fill="${SIL}"/>`
  +`<rect x="150" y="120" width="26" height="14" rx="3" fill="${SIL2}" stroke="${G}" stroke-width="1"/><rect x="161" y="134" width="4" height="22" fill="${SIL2}"/>`
  +fog(100,292,86,0.5));

A.littlegirl = svg('#1c1540',
  `<rect x="0" y="0" width="200" height="232" fill="#221a4c"/>`
  +`<path d="M18 210 C24 152 44 108 76 84 C96 70 120 64 142 68 L136 84 L150 82 L142 96 L158 96 L146 108 C158 122 166 142 168 164 L152 158 L156 176 L140 168 C136 186 130 200 122 210 Z" fill="#160f33"/>`
  +`<circle cx="118" cy="118" r="2.6" fill="${RD}" opacity="0.85"/>`
  +`<rect x="0" y="228" width="200" height="72" fill="#120d26"/>`
  +`<circle cx="128" cy="196" r="15" fill="${SIL}"/>`
  +`<circle cx="112" cy="188" r="6" fill="${SIL}"/><circle cx="144" cy="188" r="6" fill="${SIL}"/>`
  +`<path d="M104 300 C104 252 112 226 128 222 C144 226 152 252 152 300 Z" fill="${SIL}"/>`
  +`<path d="M114 200 C118 194 124 191 128 191 M142 200 C138 194 133 191 129 191" stroke="#2a2148" stroke-width="4.6" fill="none" stroke-linecap="round"/>`
  +`<circle cx="124" cy="197" r="1.6" fill="${ST}"/>`
  +fog(60,290,66,0.6));

A.idiot = svg(BG_T,
  stars([28,30,1],[172,26,1.2],[150,58,1])
  +`<path d="M96 44 L96 86 M96 62 C104 68 108 76 106 86 M96 62 C88 68 84 76 86 86" stroke="#3b3260" stroke-width="3.4" fill="none"/>`
  +`<path d="M88 92 q8 10 16 0" stroke="#3b3260" stroke-width="3" fill="none"/>`
  +`<circle cx="100" cy="150" r="15" fill="${SIL}"/>`
  +`<path d="M92 140 C82 128 72 124 62 128 C72 132 78 138 80 146 Z" fill="${SIL}"/><circle cx="64" cy="130" r="3.4" fill="${AMB}"/>`
  +`<path d="M100 136 C98 122 102 112 112 106 C108 116 110 124 114 132 Z" fill="${SIL}"/><circle cx="112" cy="108" r="3.4" fill="${AMB}"/>`
  +`<path d="M108 142 C118 132 130 130 140 136 C130 138 122 144 118 152 Z" fill="${SIL}"/><circle cx="138" cy="134" r="3.4" fill="${AMB}"/>`
  +`<path d="M68 300 C68 252 78 218 100 208 C122 218 132 252 132 300 Z" fill="${SIL}"/>`
  +`<path d="M84 224 C72 218 62 220 54 228 L60 236 C68 228 76 226 84 230 Z M116 224 C128 218 138 220 146 228 L140 236 C132 228 124 226 116 230 Z" fill="${SIL}"/>`
  +`<rect x="30" y="262" width="140" height="12" fill="${SIL2}"/><rect x="46" y="274" width="108" height="12" fill="#0d0a1c"/>`
  +fog(100,294,80,0.45));

A.prince = svg(BG_V,
  stars([30,26,1.2],[168,34,1],[186,74,1])
  +crescent(BG_V,38,40,14)
  +`<circle cx="100" cy="122" r="16" fill="${SIL}"/>`
  +`<path d="M84 108 L84 94 L92 102 L100 90 L108 102 L116 94 L116 108 Z" fill="${G}"/>`
  +`<path d="M58 300 C58 244 70 196 86 172 L100 164 L114 172 C130 196 142 244 142 300 Z" fill="${SIL}"/>`
  +`<path d="M118 176 C128 166 138 158 148 152 L152 162 C142 168 134 176 126 186 Z" fill="${SIL}"/>`
  +glow(158,138,10,'#2b2148','#4b3a20',G)
  +`<rect x="149" y="124" width="19" height="28" rx="2" fill="#e6dcc0"/><circle cx="158.5" cy="138" r="5" fill="${G}"/>`
  +`<path d="M70 282 l10 -8 2 10 z M92 288 l8 -10 4 12 z" fill="#cfc6e8" opacity="0.8"/>`
  +fog(100,294,84,0.5));

A.cursedone = svg(BG_W,
  stars([170,28,1.2],[32,38,1],[146,54,1])
  +crescent(BG_W,164,42,16)
  +`<circle cx="88" cy="118" r="16" fill="${SIL}"/>`
  +`<path d="M50 300 C50 244 60 198 76 174 L88 166 L100 174 C112 192 120 224 122 258 C123 272 124 286 124 300 Z" fill="${SIL}"/>`
  +`<path d="M76 190 C68 184 60 182 52 186 L50 196 C58 192 66 194 72 200 Z" fill="${SIL}"/>`
  +`<path d="M100 188 C110 182 118 180 126 184 L124 196 C116 190 108 190 102 196 Z" fill="${SIL}"/>`
  +glow(64,200,5,'#3a1520','#7c2334',R)
  +`<path d="M124 300 C128 278 140 262 156 254 C146 254 138 250 134 244 L146 240 C158 246 168 258 172 274 C174 282 175 291 175 300 Z" fill="${SIL2}"/>`
  +`<path d="M156 254 L166 242 L170 252 L180 246 L178 258" stroke="${SIL2}" stroke-width="4" fill="none"/>`
  +fog(90,292,80,0.55));

A.serialkiller = svg(BG_T,
  stars([30,24,1],[104,18,1])
  +glow(168,40,8,'#241c10','#4b3a1a',AMB)
  +`<rect x="164" y="48" width="7" height="60" fill="${SIL2}"/>`
  +`<path d="M26 84 l0 22 M34 82 l0 22 M42 84 l0 22 M50 82 l0 22 M20 104 l36 -18" stroke="#6f6590" stroke-width="2" fill="none"/>`
  +`<path d="M26 130 l0 20 M34 128 l0 20 M42 130 l0 20" stroke="#6f6590" stroke-width="2" fill="none"/>`
  +`<circle cx="96" cy="124" r="15" fill="${SIL}"/>`
  +`<path d="M78 118 C78 108 88 102 96 102 C108 102 114 110 114 120 L112 124 C108 114 100 110 92 112 C86 114 82 118 82 124 Z" fill="${SIL}"/>`
  +`<path d="M58 300 C58 244 68 196 82 170 L96 162 L112 170 C126 196 136 244 136 300 Z" fill="${SIL}"/>`
  +`<path d="M112 176 C120 186 126 200 128 214 L120 220 C118 206 113 194 106 186 Z" fill="${SIL}"/>`
  +`<path d="M124 218 L128 250 L120 250 Z" fill="${STEEL}"/><rect x="121" y="212" width="7" height="8" fill="${SIL2}"/>`
  +fog(100,292,84,0.5));

A.joker = svg(BG_T,
  stars([30,28,1],[170,22,1.2],[186,60,1])
  +`<path d="M118 0 L118 92" stroke="#3b3260" stroke-width="3.6"/>`
  +`<ellipse cx="118" cy="112" rx="13" ry="19" fill="none" stroke="#3b3260" stroke-width="3.6"/>`
  +`<circle cx="94" cy="140" r="14" fill="${SIL}"/>`
  +`<path d="M86 132 C76 122 66 118 56 122 C66 126 72 132 74 140 Z" fill="${SIL}"/><circle cx="58" cy="124" r="3.2" fill="${AMB}"/>`
  +`<path d="M96 126 C96 112 102 104 112 100 C107 110 108 118 112 126 Z" fill="${SIL}"/><circle cx="111" cy="102" r="3.2" fill="${AMB}"/>`
  +`<path d="M64 300 C64 254 72 222 94 212 C112 220 122 246 124 278 C124 286 125 293 125 300 Z" fill="${SIL}"/>`
  +`<path d="M104 224 C110 214 116 206 122 200 L128 208 C122 214 116 222 112 230 Z" fill="${SIL}"/>`
  +[[40,180],[60,210],[150,170],[164,210],[142,240],[36,244]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.8" fill="#7d7694" opacity="0.7"/>`).join('')
  +fog(100,294,84,0.5));

window.ROLE_ART = A;
if (typeof module!=='undefined' && module.exports) module.exports = A;
})();
