export const VIETNAM_PROVINCES = [
  "An Giang", "Bắc Ninh", "Cà Mau", "Cao Bằng", "Điện Biên", "Đồng Nai", "Đồng Tháp", 
  "Gia Lai", "Hà Tĩnh", "Hưng Yên", "Khánh Hoà", "Lai Châu", "Lâm Đồng", "Lạng Sơn", 
  "Lào Cai", "Nghệ An", "Ninh Bình", "Phú Thọ", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", 
  "Sơn La", "Tây Ninh", "Thái Nguyên", "Thanh Hóa", "Thành phố Cần Thơ", "Thành phố Đà Nẵng", 
  "Thành phố Hà Nội", "Thành phố Hải Phòng", "Thành phố Hồ Chí Minh", "Thành phố Huế", 
  "Tuyên Quang", "Vĩnh Long", "Đắk Lắk"
].sort((a, b) => a.localeCompare(b, 'vi'));

// Map legacy provinces to their new merged administrative centers
export const LEGACY_PROVINCE_MAP: Record<string, string> = {
  "Bình Dương": "Thành phố Hồ Chí Minh",
  "Bà Rịa - Vũng Tàu": "Thành phố Hồ Chí Minh",
  "Hải Dương": "Thành phố Hải Phòng",
  "Quảng Nam": "Thành phố Đà Nẵng",
  "Sóc Trăng": "Thành phố Cần Thơ",
  "Hậu Giang": "Thành phố Cần Thơ",
  "Kiên Giang": "An Giang",
  "Bắc Giang": "Bắc Ninh",
  "Bạc Liêu": "Cà Mau",
  "Bình Phước": "Đồng Nai",
  "Tiền Giang": "Đồng Tháp",
  "Bình Định": "Gia Lai",
  "Thái Bình": "Hưng Yên",
  "Ninh Thuận": "Khánh Hoà",
  "Đắk Nông": "Lâm Đồng",
  "Bình Thuận": "Lâm Đồng",
  "Yên Bái": "Lào Cai",
  "Nam Định": "Ninh Bình",
  "Hà Nam": "Ninh Bình",
  "Vĩnh Phúc": "Phú Thọ",
  "Hòa Bình": "Phú Thọ",
  "Kon Tum": "Quảng Ngãi",
  "Quảng Bình": "Quảng Trị",
  "Long An": "Tây Ninh",
  "Bắc Kạn": "Thái Nguyên",
  "Hà Giang": "Tuyên Quang",
  "Bến Tre": "Vĩnh Long",
  "Trà Vinh": "Vĩnh Long",
  "Phú Yên": "Đắk Lắk",
};

/**
 * Approximate centroid (administrative-center coordinates) for each of the 34
 * post-2025-merger provinces/municipalities. Used as a coordinate-based fallback
 * when Nominatim's address text can't be matched to a name in VIETNAM_PROVINCES
 * or LEGACY_PROVINCE_MAP (see resolveProvince.ts).
 *
 * Sourcing note: entries marked "sourced" were pulled directly from the
 * Wikipedia "Provinces of Vietnam" administrative-center table. The rest are
 * inferred from the retained province/city's pre-2025 capital, since exact
 * post-merger admin-center coordinates weren't independently verified for
 * every entry. Accuracy at this scale only needs to get "nearest province"
 * right, not pinpoint precision — but if you want authoritative figures,
 * swap this table for GSO's official boundary data or the `vietnam-address-database`
 * npm package before relying on it for anything beyond a form-prefill hint.
 */
export const PROVINCE_CENTROIDS: Record<string, { lat: number; lon: number }> = {
  "An Giang": { lat: 10.3855, lon: 105.4189 },              // Long Xuyên
  "Bắc Ninh": { lat: 21.1861, lon: 106.0763 },               // Bắc Ninh city
  "Cà Mau": { lat: 9.1769, lon: 105.1524 },                  // Cà Mau city
  "Cao Bằng": { lat: 22.6666, lon: 106.2639 },               // Cao Bằng city
  "Điện Biên": { lat: 21.3891, lon: 103.0161 },              // Điện Biên Phủ
  "Đồng Nai": { lat: 10.9447, lon: 106.8243 },               // Biên Hòa
  "Đồng Tháp": { lat: 10.4494, lon: 105.6926 },              // Cao Lãnh
  "Gia Lai": { lat: 13.9833, lon: 108.0000 },                // Pleiku
  "Hà Tĩnh": { lat: 18.3428, lon: 105.9057 },                // Hà Tĩnh city
  "Hưng Yên": { lat: 20.6464, lon: 106.0512 },               // Hưng Yên city
  "Khánh Hoà": { lat: 12.2388, lon: 109.1967 },              // Nha Trang
  "Lai Châu": { lat: 22.3964, lon: 103.4703 },               // Lai Châu city
  "Lâm Đồng": { lat: 11.9404, lon: 108.4583 },               // Đà Lạt
  "Lạng Sơn": { lat: 21.8537, lon: 106.7610 },               // Lạng Sơn city — sourced
  "Lào Cai": { lat: 21.7168, lon: 104.8986 },                // Yên Bái ward — sourced
  "Nghệ An": { lat: 18.6796, lon: 105.6813 },                // Vinh
  "Ninh Bình": { lat: 20.2506, lon: 105.9744 },              // Ninh Bình city
  "Phú Thọ": { lat: 21.3227, lon: 105.4020 },                // Việt Trì ward — sourced
  "Quảng Ngãi": { lat: 15.1213, lon: 108.7929 },             // Quảng Ngãi city
  "Quảng Ninh": { lat: 20.9500, lon: 107.0833 },             // Hạ Long ward — sourced
  "Quảng Trị": { lat: 16.8163, lon: 107.1005 },              // Đông Hà
  "Sơn La": { lat: 21.3256, lon: 103.9188 },                 // Sơn La city
  "Tây Ninh": { lat: 11.3100, lon: 106.0989 },               // Tây Ninh city
  "Thái Nguyên": { lat: 21.5928, lon: 105.8442 },            // Phan Đình Phùng ward — sourced
  "Thanh Hóa": { lat: 19.8067, lon: 105.7852 },              // Thanh Hóa city
  "Thành phố Cần Thơ": { lat: 10.0452, lon: 105.7469 },
  "Thành phố Đà Nẵng": { lat: 16.0544, lon: 108.2022 },
  "Thành phố Hà Nội": { lat: 21.0278, lon: 105.8342 },
  "Thành phố Hải Phòng": { lat: 20.8449, lon: 106.6881 },
  "Thành phố Hồ Chí Minh": { lat: 10.8231, lon: 106.6297 },
  "Thành phố Huế": { lat: 16.4637, lon: 107.5909 },
  "Tuyên Quang": { lat: 21.8233, lon: 105.2280 },            // Minh Xuân ward — sourced
  "Vĩnh Long": { lat: 10.2537, lon: 105.9722 },              // Vĩnh Long city
  "Đắk Lắk": { lat: 12.6667, lon: 108.0500 },                // Buôn Ma Thuột
};
