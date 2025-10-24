export const emotionFaces = {
  idle: "(・ω・)",
  curious: "(๑•̀ㅂ•́)و✧",
  alert: "(╬ Ò﹏Ó)",
  focus: "(ง •̀_•́)ง",
  delight: "(＾▽＾)",
  alarm: "(╯°□°）╯︵ ┻━┻",
  neutral: "(•_•)",
  calm: "(￣︶￣*)", 
  success: "(ᵔᴥᵔ)",
  caution: "(¬_¬ )", 
  stealth: "(¬‿¬)",
  resilience: "(づ｡◕‿‿◕｡)づ",
};

export const faceForSeverity = (severity) => {
  const normalized = (severity || "").toLowerCase();
  if (normalized.includes("critical")) {
    return emotionFaces.alert;
  }
  if (normalized.includes("high")) {
    return emotionFaces.alarm;
  }
  if (normalized.includes("medium")) {
    return emotionFaces.caution;
  }
  if (normalized.includes("low")) {
    return emotionFaces.delight;
  }
  return emotionFaces.neutral;
};
