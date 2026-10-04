export interface LandingInput {
  weight:number; approachSpeed:number; windDirection:number; windMagnitude:number;
  runwayHeading:number; elevation:number; temperature:number; slope:number; pressure:number;
  runwayLength:number; flaps:number; runwayCondition:number;
}

export const LANDING_SCOPE = '本地着陆参考仅支持 190000 kg 基准重量。重量修正资料待核验，其他重量不输出距离。';

export function landingInputIssue(input: LandingInput): string | null {
  if (Object.values(input).some(v=>typeof v!=='number'||!Number.isFinite(v))) return '请填写全部有效的着陆参数';
  if (Math.abs(input.weight-190000)>0.5) return LANDING_SCOPE;
  if(input.approachSpeed<90||input.approachSpeed>350||input.runwayLength<=0||input.runwayLength>6000||
    input.pressure<800||input.pressure>1200||input.temperature< -55||input.temperature>55||
    input.elevation< -2000||input.elevation>20000||Math.abs(input.slope)>2||
    input.windMagnitude<0||input.windMagnitude>150||input.windDirection<0||input.windDirection>360||
    input.runwayHeading<0||input.runwayHeading>360||![0,1].includes(input.flaps)||
    ![0,1,2,3,4,5].includes(input.runwayCondition)) return '着陆参数超出本地工具输入范围';
  return null;
}

export function landingOutputIssue(result:Record<string,number>):string|null {
  return Object.values(result).some(v=>!Number.isFinite(v)||v<=0)
    ? '当前条件产生了无效距离，结果已撤销。请检查输入与资料范围。' : null;
}
