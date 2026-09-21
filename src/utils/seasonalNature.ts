export interface SeasonalNatureTheme {
  season: 'Xuân' | 'Hạ' | 'Thu' | 'Đông';
  seasonTitle: string;
  seasonIcon: string;
  themeName: string;
  poem: string;
  images: {
    url: string;
    caption: string;
  }[];
  accentGlow: string;
  badgeBg: string;
  badgeBorder: string;
  dateBadgeGradient: string;
}

export const MONTHLY_NATURE_THEMES: Record<number, SeasonalNatureTheme> = {
  // MÙA XUÂN (Tháng 1, 2, 3) - Cây cối đâm chồi, hoa đào, hoa mai, suối xuân tươi sáng
  1: {
    season: 'Xuân',
    seasonTitle: 'Mùa Xuân Khởi Sắc',
    seasonIcon: '🌸',
    themeName: 'Hoa Đào & Lộc Biếc Đầu Năm',
    poem: 'Đất trời giao hòa, vạn vật hồi sinh mừng tuổi mới',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=1600&q=80',
        caption: 'Hoa đào khoe sắc rực rỡ đón xuân'
      },
      {
        url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1600&q=80',
        caption: 'Vườn hoa xuân tươi thắm trong nắng sớm'
      },
      {
        url: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=1600&q=80',
        caption: 'Đồng cỏ xuân xanh mướt ngập tràn sức sống'
      }
    ],
    accentGlow: 'from-pink-500/30 via-rose-500/20 to-amber-500/30',
    badgeBg: 'bg-rose-500/20 text-pink-200',
    badgeBorder: 'border-pink-400/40',
    dateBadgeGradient: 'from-amber-400 via-rose-400 to-pink-500'
  },
  2: {
    season: 'Xuân',
    seasonTitle: 'Mùa Xuân Viên Mãn',
    seasonIcon: '🌱',
    themeName: 'Chồi Non Biếc Xanh & Suối Đầu Nguồn',
    poem: 'Mầm xanh nảy lộc, suối nguồn róc rách đưa tin vui',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?auto=format&fit=crop&w=1600&q=80',
        caption: 'Đường hoa anh đào ven suối trong lành'
      },
      {
        url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=80',
        caption: 'Rừng xanh đón làn nắng ấm đầu xuân'
      },
      {
        url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=1600&q=80',
        caption: 'Cánh hoa tinh khôi trong gió xuân'
      }
    ],
    accentGlow: 'from-emerald-500/30 via-teal-500/20 to-lime-500/30',
    badgeBg: 'bg-emerald-500/20 text-emerald-200',
    badgeBorder: 'border-emerald-400/40',
    dateBadgeGradient: 'from-emerald-400 via-lime-300 to-amber-400'
  },
  3: {
    season: 'Xuân',
    seasonTitle: 'Mùa Xuân Tươi Thắm',
    seasonIcon: '🌺',
    themeName: 'Vườn Hoa Rực Rỡ & Bầu Trời Trong Xanh',
    poem: 'Muôn hoa đua sắc, nắng xuân rạng rỡ từng bước chân',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1600&q=80',
        caption: 'Thảm hoa mùa xuân nở rộ khoe sắc'
      },
      {
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80',
        caption: 'Dòng sông êm đềm uốn quanh thung lũng xanh'
      },
      {
        url: 'https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?auto=format&fit=crop&w=1600&q=80',
        caption: 'Sắc hoa mùa xuân rực rỡ đón chào ngày mới'
      }
    ],
    accentGlow: 'from-rose-500/30 via-purple-500/20 to-amber-400/30',
    badgeBg: 'bg-rose-500/20 text-rose-200',
    badgeBorder: 'border-rose-400/40',
    dateBadgeGradient: 'from-yellow-400 via-rose-400 to-purple-500'
  },

  // MÙA HẠ (Tháng 4, 5, 6) - Hồ sen thanh khiết, sông biếc ngọc, tán cây xanh rợp
  4: {
    season: 'Hạ',
    seasonTitle: 'Mùa Hạ Xanh Tươi',
    seasonIcon: '🌿',
    themeName: 'Dòng Sông Ngọc Bích & Thung Lũng Xanh',
    poem: 'Nắng ấm đầu hè, làn nước trong veo xua tan oi ả',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1600&q=80',
        caption: 'Dòng suối trong vắt len lỏi giữa rừng xanh'
      },
      {
        url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
        caption: 'Bờ biển trong xanh và rặng dừa thơ mộng'
      },
      {
        url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=80',
        caption: 'Tán cây xanh thẳm che mát ban trưa'
      }
    ],
    accentGlow: 'from-cyan-500/30 via-blue-500/20 to-emerald-500/30',
    badgeBg: 'bg-cyan-500/20 text-cyan-200',
    badgeBorder: 'border-cyan-400/40',
    dateBadgeGradient: 'from-cyan-400 via-teal-300 to-amber-300'
  },
  5: {
    season: 'Hạ',
    seasonTitle: 'Mùa Hạ Hương Sen',
    seasonIcon: '🪷',
    themeName: 'Hồ Sen Thanh Khiết & Ánh Nắng Ban Mai',
    poem: 'Hồ sen tỏa ngát hương thơm, thanh cao đón mừng tuổi mới',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&w=1600&q=80',
        caption: 'Hồ sen nở rộ thơm ngát trong nắng hè'
      },
      {
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80',
        caption: 'Mặt nước hồ phẳng lặng như gương soi mây trời'
      },
      {
        url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1600&q=80',
        caption: 'Dòng suối mát trong lòng thiên nhiên'
      }
    ],
    accentGlow: 'from-pink-500/30 via-emerald-500/20 to-teal-500/30',
    badgeBg: 'bg-pink-500/20 text-pink-200',
    badgeBorder: 'border-pink-400/40',
    dateBadgeGradient: 'from-pink-400 via-rose-300 to-amber-300'
  },
  6: {
    season: 'Hạ',
    seasonTitle: 'Mùa Hạ Nắng Vàng',
    seasonIcon: '☀️',
    themeName: 'Rừng Cây Rợp Bóng & Bầu Trời Đại Ngàn',
    poem: 'Trời cao mây biếc, bóng mát cây rừng chở che bình yên',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=80',
        caption: 'Ánh nắng vàng rọi qua vòm lá rừng xanh thẳm'
      },
      {
        url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
        caption: 'Bờ cát vàng và làn sóng biển hè dạt dào'
      },
      {
        url: 'https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&w=1600&q=80',
        caption: 'Hồ nước thanh tịnh ngát sắc sen hồng'
      }
    ],
    accentGlow: 'from-amber-500/30 via-emerald-500/20 to-teal-500/30',
    badgeBg: 'bg-amber-500/20 text-amber-200',
    badgeBorder: 'border-amber-400/40',
    dateBadgeGradient: 'from-amber-400 via-yellow-300 to-emerald-400'
  },

  // MÙA THU (Tháng 7, 8, 9) - Dòng sông mùa thu, lá vàng, cúc thu dịu mát
  7: {
    season: 'Thu',
    seasonTitle: 'Mùa Thu Êm Đềm',
    seasonIcon: '🌾',
    themeName: 'Dòng Sông Dịu Mát & Mây Trôi Lãng Đãng',
    poem: 'Gió thu se mát, dòng sông hiền hòa mang theo ngàn phúc lành',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80',
        caption: 'Dòng sông mùa thu phản chiếu bóng núi thanh bình'
      },
      {
        url: 'https://images.unsplash.com/photo-1476820865390-c52aeebb9891?auto=format&fit=crop&w=1600&q=80',
        caption: 'Lối mòn thu êm dịu phủ đầy lá vàng'
      },
      {
        url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80',
        caption: 'Rừng cây chuyển mình đón làn gió thu mát rượi'
      }
    ],
    accentGlow: 'from-amber-500/30 via-orange-500/20 to-teal-500/30',
    badgeBg: 'bg-amber-500/20 text-amber-200',
    badgeBorder: 'border-amber-400/40',
    dateBadgeGradient: 'from-amber-400 via-orange-300 to-yellow-200'
  },
  8: {
    season: 'Thu',
    seasonTitle: 'Mùa Thu Vàng Rực',
    seasonIcon: '🍂',
    themeName: 'Rừng Lá Vàng Soi Bóng Hồ Thu',
    poem: 'Mùa thu vàng óng ả, ngàn lời chúc tụng trọn vẹn thành công',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1476820865390-c52aeebb9891?auto=format&fit=crop&w=1600&q=80',
        caption: 'Rừng thu lá vàng rực rỡ lãng mạn'
      },
      {
        url: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1600&q=80',
        caption: 'Mặt hồ hoàng hôn mùa thu óng ả'
      },
      {
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80',
        caption: 'Dòng sông thu êm trôi giữa thung lũng vàng'
      }
    ],
    accentGlow: 'from-amber-500/35 via-rose-500/20 to-orange-500/30',
    badgeBg: 'bg-orange-500/20 text-orange-200',
    badgeBorder: 'border-orange-400/40',
    dateBadgeGradient: 'from-amber-400 via-yellow-400 to-orange-500'
  },
  9: {
    season: 'Thu',
    seasonTitle: 'Mùa Thu Trăng Sáng',
    seasonIcon: '🍁',
    themeName: 'Hoàng Hôn Thu Ấm & Hoa Cúc Vàng',
    poem: 'Ánh hoàng hôn dịu ngọt, thu sang ấm áp nghĩa tình đồng nghiệp',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1600&q=80',
        caption: 'Ánh hoàng hôn thu vàng ấm áp bên làn nước biếc'
      },
      {
        url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80',
        caption: 'Nắng chiều thu xuyên qua tán rừng thơ mộng'
      },
      {
        url: 'https://images.unsplash.com/photo-1476820865390-c52aeebb9891?auto=format&fit=crop&w=1600&q=80',
        caption: 'Lá phong vàng rực rỡ đón gió heo may'
      }
    ],
    accentGlow: 'from-orange-500/30 via-red-500/20 to-amber-500/30',
    badgeBg: 'bg-red-500/20 text-rose-200',
    badgeBorder: 'border-rose-400/40',
    dateBadgeGradient: 'from-rose-400 via-amber-300 to-yellow-400'
  },

  // MÙA ĐÔNG (Tháng 10, 11, 12) - Rừng thông sương sớm, núi non hùng vĩ, bầu trời sao
  10: {
    season: 'Đông',
    seasonTitle: 'Mùa Đông Nắng Ấm',
    seasonIcon: '☀️',
    themeName: 'Ánh Nắng Vàng Rực & Rừng Thông Xanh Biếc',
    poem: 'Nắng ấm ngập tràn thung lũng, sưởi ấm niềm vui đón tuổi mới',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80',
        caption: 'Ánh rạng đông vàng rực rỡ trên đỉnh núi ngút ngàn'
      },
      {
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80',
        caption: 'Mặt nước hồ trong xanh ngọc bích soi bóng mây trời'
      },
      {
        url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=80',
        caption: 'Rừng thông đón ánh nắng mặt trời rực rỡ chan hòa'
      }
    ],
    accentGlow: 'from-amber-400/35 via-rose-300/20 to-sky-400/25',
    badgeBg: 'bg-amber-100 text-amber-900',
    badgeBorder: 'border-amber-300',
    dateBadgeGradient: 'from-amber-400 via-yellow-300 to-amber-500'
  },
  11: {
    season: 'Đông',
    seasonTitle: 'Mùa Đông Thanh Khiết',
    seasonIcon: '🌼',
    themeName: 'Cúc Họa Mi Nở Rộ & Nắng Sớm Mùa Đông',
    poem: 'Hoa trắng tinh khôi trong nắng sớm, ngàn lời chúc mừng hạnh phúc thăng hoa',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1600&q=80',
        caption: 'Đồng hoa nở rộ tươi sáng đón ánh nắng ban mai'
      },
      {
        url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80',
        caption: 'Bình minh rực rỡ tỏa ánh sáng ấm áp khắp muôn nơi'
      },
      {
        url: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=1600&q=80',
        caption: 'Đồi cỏ thênh thang rực sáng trong làn gió thanh mát'
      }
    ],
    accentGlow: 'from-sky-400/30 via-amber-300/25 to-pink-300/25',
    badgeBg: 'bg-sky-100 text-sky-900',
    badgeBorder: 'border-sky-300',
    dateBadgeGradient: 'from-sky-400 via-amber-300 to-yellow-400'
  },
  12: {
    season: 'Đông',
    seasonTitle: 'Mùa Lễ Hội Rạng Rỡ',
    seasonIcon: '🎉',
    themeName: 'Ánh Nắng Mùa Lễ Hội & Niềm Vui Hân Hoan',
    poem: 'Đất trời rạng rỡ đón chào năm mới, tuổi mới đong đầy tài lộc an khang',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80',
        caption: 'Ánh rạng đông bừng sáng trên nền trời cao xanh'
      },
      {
        url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1600&q=80',
        caption: 'Ngàn hoa khoe sắc mừng ngày sinh nhật tươi đẹp'
      },
      {
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80',
        caption: 'Dòng suối trong veo lấp lánh ánh nắng ban mai'
      }
    ],
    accentGlow: 'from-rose-400/35 via-amber-300/30 to-yellow-400/35',
    badgeBg: 'bg-rose-100 text-rose-900',
    badgeBorder: 'border-rose-300',
    dateBadgeGradient: 'from-amber-400 via-rose-400 to-yellow-400'
  }
};

export const getSeasonalNatureTheme = (month: number, variantOffset: number = 0) => {
  const safeMonth = Math.max(1, Math.min(12, month || 1));
  const theme = MONTHLY_NATURE_THEMES[safeMonth] || MONTHLY_NATURE_THEMES[1];
  const images = theme.images;
  const imageIndex = Math.abs(variantOffset) % images.length;
  const activeImage = images[imageIndex];

  return {
    ...theme,
    activeImage,
    imageIndex,
    totalVariants: images.length
  };
};
