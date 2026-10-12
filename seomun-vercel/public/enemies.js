// Shared encounter art and names; Seoul retains the original monster.
export const ENEMIES={
 city:{name:'흑영',han:'黑影',epithet:'도시를 거스르는 그림자',image:'boss.webp',portrait:'boss-token.webp',quote:'그토록 작은 불빛으로, 이 밤을 지킬 수 있겠느냐.',description:'도시의 모든 빛이 켜진 순간, 그림자 하나가 하늘을 올려다보았다.'},
 school:{name:'야간감독',han:'夜監',epithet:'출석부에 없는 마지막 교사',image:'school-enemy.webp',portrait:'school-enemy-mobile.webp',quote:'아직 종이 울리지 않았다. 아무도, 이 학교를 나갈 수 없다.',description:'복도 끝의 제복은 움직이지 않는다. 벽에 비친 손들만 당신을 향해 돌아선다.'},
 shrine:{name:'봉육',han:'封肉',epithet:'부적 아래 숨 쉬는 신체',image:'shrine-enemy.webp',portrait:'shrine-enemy-mobile.webp',quote:'벗겨라. 그 종이 아래에서, 오래도록 너를 기다렸다.',description:'금줄에 매달린 부적이 들썩인다. 제단에 엉긴 살점이 하나의 숨을 쉰다.'}
};
export function enemyFor(location){return ENEMIES[location]||ENEMIES.city}
