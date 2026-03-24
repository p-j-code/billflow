require("dotenv").config();
const mongoose = require("mongoose");
const HsnMaster = require("../models/HsnMaster");

const HSN_DATA = [
  // LIVE ANIMALS
  {
    code: "0101",
    description: "Live horses, asses, mules",
    type: "goods",
    gstRate: 0,
    category: "Live Animals",
  },
  {
    code: "0102",
    description: "Live bovine animals",
    type: "goods",
    gstRate: 0,
    category: "Live Animals",
  },
  {
    code: "0207",
    description: "Meat and edible offal of poultry",
    type: "goods",
    gstRate: 0,
    category: "Meat",
  },
  {
    code: "0302",
    description: "Fish, fresh or chilled",
    type: "goods",
    gstRate: 0,
    category: "Seafood",
  },
  {
    code: "0401",
    description: "Milk and cream, not concentrated",
    type: "goods",
    gstRate: 0,
    category: "Dairy",
  },
  {
    code: "0405",
    description: "Butter and other fats derived from milk",
    type: "goods",
    gstRate: 12,
    category: "Dairy",
  },
  {
    code: "0406",
    description: "Cheese and curd",
    type: "goods",
    gstRate: 12,
    category: "Dairy",
  },
  {
    code: "0409",
    description: "Natural honey",
    type: "goods",
    gstRate: 0,
    category: "Food",
  },
  // VEGETABLES & GRAINS
  {
    code: "0701",
    description: "Potatoes, fresh or chilled",
    type: "goods",
    gstRate: 0,
    category: "Vegetables",
  },
  {
    code: "0702",
    description: "Tomatoes, fresh or chilled",
    type: "goods",
    gstRate: 0,
    category: "Vegetables",
  },
  {
    code: "0703",
    description: "Onions, shallots, garlic, leeks",
    type: "goods",
    gstRate: 0,
    category: "Vegetables",
  },
  {
    code: "0901",
    description: "Coffee, whether or not roasted",
    type: "goods",
    gstRate: 0,
    category: "Beverages",
  },
  {
    code: "0902",
    description: "Tea, whether or not flavoured",
    type: "goods",
    gstRate: 0,
    category: "Beverages",
  },
  {
    code: "0910",
    description: "Ginger, saffron, turmeric, thyme, bay leaves, curry",
    type: "goods",
    gstRate: 0,
    category: "Spices",
  },
  {
    code: "1001",
    description: "Wheat and meslin",
    type: "goods",
    gstRate: 0,
    category: "Grains",
  },
  {
    code: "1006",
    description: "Rice",
    type: "goods",
    gstRate: 0,
    category: "Grains",
  },
  {
    code: "1101",
    description: "Wheat or meslin flour",
    type: "goods",
    gstRate: 0,
    category: "Flour",
  },
  {
    code: "1511",
    description: "Palm oil and its fractions",
    type: "goods",
    gstRate: 5,
    category: "Edible Oils",
  },
  {
    code: "1512",
    description: "Sunflower-seed or cotton-seed oil",
    type: "goods",
    gstRate: 5,
    category: "Edible Oils",
  },
  {
    code: "1701",
    description: "Cane or beet sugar",
    type: "goods",
    gstRate: 5,
    category: "Sugar",
  },
  {
    code: "1901",
    description: "Malt extract; food preparations of flour, starch",
    type: "goods",
    gstRate: 18,
    category: "Processed Food",
  },
  {
    code: "1905",
    description: "Bread, pastry, cakes, biscuits and other bakers wares",
    type: "goods",
    gstRate: 12,
    category: "Bakery",
  },
  {
    code: "2009",
    description: "Fruit juices and vegetable juices",
    type: "goods",
    gstRate: 12,
    category: "Beverages",
  },
  {
    code: "2106",
    description: "Food preparations not elsewhere specified",
    type: "goods",
    gstRate: 18,
    category: "Processed Food",
  },
  {
    code: "2201",
    description: "Waters, natural or artificial mineral waters, aerated waters",
    type: "goods",
    gstRate: 0,
    category: "Beverages",
  },
  {
    code: "2202",
    description: "Waters with added sugar, sweetening matter or flavour",
    type: "goods",
    gstRate: 12,
    category: "Beverages",
  },
  {
    code: "2203",
    description: "Beer made from malt",
    type: "goods",
    gstRate: 28,
    category: "Beverages",
  },
  // CHEMICALS & PHARMA
  {
    code: "2523",
    description: "Portland cement, aluminous cement, slag cement",
    type: "goods",
    gstRate: 28,
    category: "Construction Materials",
  },
  {
    code: "2710",
    description: "Petroleum oils and oils from bituminous minerals",
    type: "goods",
    gstRate: 18,
    category: "Fuel",
  },
  {
    code: "3004",
    description:
      "Medicaments for therapeutic or prophylactic uses, measured doses",
    type: "goods",
    gstRate: 12,
    category: "Pharmaceuticals",
  },
  {
    code: "3005",
    description: "Wadding, gauze, bandages and similar articles (medical)",
    type: "goods",
    gstRate: 12,
    category: "Medical Supplies",
  },
  {
    code: "3208",
    description: "Paints and varnishes based on synthetic polymers",
    type: "goods",
    gstRate: 28,
    category: "Paints",
  },
  {
    code: "3301",
    description: "Essential oils, resinoids, extracted oleoresins",
    type: "goods",
    gstRate: 18,
    category: "Perfumery",
  },
  {
    code: "3303",
    description: "Perfumes and toilet waters",
    type: "goods",
    gstRate: 18,
    category: "Perfumery",
  },
  {
    code: "3304",
    description: "Beauty or make-up preparations and skin care preparations",
    type: "goods",
    gstRate: 18,
    category: "Cosmetics",
  },
  {
    code: "3305",
    description: "Preparations for use on hair",
    type: "goods",
    gstRate: 18,
    category: "Cosmetics",
  },
  {
    code: "3306",
    description: "Preparations for oral or dental hygiene",
    type: "goods",
    gstRate: 12,
    category: "Personal Care",
  },
  {
    code: "3307",
    description: "Pre-shave, shaving, after-shave preparations, deodorants",
    type: "goods",
    gstRate: 18,
    category: "Personal Care",
  },
  {
    code: "3401",
    description: "Soap, organic surface-active products for use as soap",
    type: "goods",
    gstRate: 18,
    category: "Cleaning",
  },
  {
    code: "3402",
    description: "Organic surface-active agents, washing preparations",
    type: "goods",
    gstRate: 18,
    category: "Cleaning",
  },
  {
    code: "3809",
    description:
      "Finishing agents used in textile, paper or leather industries",
    type: "goods",
    gstRate: 18,
    category: "Textile Chemicals",
  },
  // PAPER & STATIONERY
  {
    code: "4802",
    description: "Uncoated paper and paperboard for writing or printing",
    type: "goods",
    gstRate: 12,
    category: "Paper",
  },
  {
    code: "4819",
    description: "Cartons, boxes, cases, bags and packing containers of paper",
    type: "goods",
    gstRate: 12,
    category: "Packaging",
  },
  {
    code: "4820",
    description:
      "Registers, account books, note books, order books, receipt books",
    type: "goods",
    gstRate: 12,
    category: "Stationery",
  },
  {
    code: "4901",
    description:
      "Printed books, brochures, leaflets and similar printed matter",
    type: "goods",
    gstRate: 0,
    category: "Books",
  },
  {
    code: "4902",
    description: "Newspapers, journals and periodicals",
    type: "goods",
    gstRate: 0,
    category: "Books",
  },
  {
    code: "4911",
    description:
      "Other printed matter, including printed pictures and photographs",
    type: "goods",
    gstRate: 12,
    category: "Printing",
  },
  // TEXTILES — YARN & FABRIC
  {
    code: "5004",
    description: "Silk yarn (other than yarn spun from silk waste)",
    type: "goods",
    gstRate: 5,
    category: "Textile - Silk",
  },
  {
    code: "5007",
    description: "Woven fabrics of silk or of silk waste",
    type: "goods",
    gstRate: 5,
    category: "Textile - Silk",
  },
  {
    code: "5106",
    description: "Yarn of carded wool, not put up for retail sale",
    type: "goods",
    gstRate: 5,
    category: "Textile - Wool",
  },
  {
    code: "5111",
    description: "Woven fabrics of carded wool or of carded fine animal hair",
    type: "goods",
    gstRate: 5,
    category: "Textile - Wool",
  },
  {
    code: "5205",
    description: "Cotton yarn >= 85% cotton, not for retail",
    type: "goods",
    gstRate: 5,
    category: "Textile - Cotton Yarn",
  },
  {
    code: "5207",
    description: "Cotton yarn put up for retail sale",
    type: "goods",
    gstRate: 5,
    category: "Textile - Cotton Yarn",
  },
  {
    code: "5208",
    description: "Woven fabrics of cotton >= 85%, not more than 200 g/m2",
    type: "goods",
    gstRate: 5,
    category: "Textile - Cotton Fabrics",
  },
  {
    code: "5209",
    description: "Woven fabrics of cotton >= 85%, more than 200 g/m2",
    type: "goods",
    gstRate: 5,
    category: "Textile - Cotton Fabrics",
  },
  {
    code: "5210",
    description:
      "Woven fabrics of cotton < 85% mixed mainly with man-made fibres, <= 200g",
    type: "goods",
    gstRate: 5,
    category: "Textile - Cotton Fabrics",
  },
  {
    code: "5211",
    description: "Woven fabrics of cotton < 85% mixed man-made fibres > 200g",
    type: "goods",
    gstRate: 5,
    category: "Textile - Cotton Fabrics",
  },
  {
    code: "5401",
    description: "Sewing thread of man-made filaments",
    type: "goods",
    gstRate: 12,
    category: "Textile - Thread",
  },
  {
    code: "5407",
    description: "Woven fabrics of synthetic filament yarn",
    type: "goods",
    gstRate: 5,
    category: "Textile - Synthetic Fabrics",
  },
  {
    code: "5408",
    description: "Woven fabrics of artificial filament yarn",
    type: "goods",
    gstRate: 5,
    category: "Textile - Synthetic Fabrics",
  },
  {
    code: "5509",
    description: "Yarn of synthetic staple fibres (not sewing thread)",
    type: "goods",
    gstRate: 12,
    category: "Textile - Synthetic Yarn",
  },
  {
    code: "5512",
    description: "Woven fabrics of synthetic staple fibres >= 85%",
    type: "goods",
    gstRate: 5,
    category: "Textile - Synthetic Fabrics",
  },
  {
    code: "5513",
    description:
      "Woven fabrics of synthetic staple fibres < 85% mixed cotton <= 170g",
    type: "goods",
    gstRate: 5,
    category: "Textile - Synthetic Fabrics",
  },
  {
    code: "5514",
    description:
      "Woven fabrics of synthetic staple fibres < 85% mixed cotton > 170g",
    type: "goods",
    gstRate: 5,
    category: "Textile - Synthetic Fabrics",
  },
  {
    code: "5515",
    description: "Other woven fabrics of synthetic staple fibres",
    type: "goods",
    gstRate: 5,
    category: "Textile - Synthetic Fabrics",
  },
  {
    code: "5516",
    description: "Woven fabrics of artificial staple fibres",
    type: "goods",
    gstRate: 5,
    category: "Textile - Synthetic Fabrics",
  },
  {
    code: "5601",
    description: "Wadding of textile materials and articles thereof",
    type: "goods",
    gstRate: 12,
    category: "Textile - Technical",
  },
  {
    code: "5602",
    description:
      "Felt, whether or not impregnated, coated, covered or laminated",
    type: "goods",
    gstRate: 12,
    category: "Textile - Felt",
  },
  {
    code: "5603",
    description: "Nonwovens, whether or not impregnated, coated or laminated",
    type: "goods",
    gstRate: 12,
    category: "Textile - Nonwoven",
  },
  {
    code: "5607",
    description: "Twine, cordage, ropes and cables, whether or not plaited",
    type: "goods",
    gstRate: 12,
    category: "Textile - Ropes",
  },
  {
    code: "5701",
    description: "Carpets and other textile floor coverings, knotted",
    type: "goods",
    gstRate: 12,
    category: "Textile - Carpets",
  },
  {
    code: "5702",
    description: "Carpets and other textile floor coverings, woven",
    type: "goods",
    gstRate: 12,
    category: "Textile - Carpets",
  },
  {
    code: "5703",
    description: "Carpets and other textile floor coverings, tufted",
    type: "goods",
    gstRate: 12,
    category: "Textile - Carpets",
  },
  {
    code: "5804",
    description:
      "Tulles and other net fabrics; lace; embroidery in the piece, strips or motifs",
    type: "goods",
    gstRate: 12,
    category: "Textile - Embroidery",
  },
  {
    code: "5806",
    description: "Narrow woven fabrics, other than goods of heading 5807",
    type: "goods",
    gstRate: 12,
    category: "Textile - Narrow Fabrics",
  },
  {
    code: "5807",
    description: "Labels, badges and similar articles of textile materials",
    type: "goods",
    gstRate: 12,
    category: "Textile - Labels",
  },
  {
    code: "5808",
    description: "Braids in the piece; ornamental trimmings in the piece",
    type: "goods",
    gstRate: 12,
    category: "Textile - Trimmings",
  },
  {
    code: "5810",
    description: "Embroidery in the piece, in strips or in motifs",
    type: "goods",
    gstRate: 12,
    category: "Textile - Embroidery",
  },
  {
    code: "5811",
    description:
      "Quilted textile products in the piece, composed of one or more layers",
    type: "goods",
    gstRate: 12,
    category: "Textile - Quilted",
  },
  {
    code: "5901",
    description: "Textile fabrics coated with gum or amylaceous substances",
    type: "goods",
    gstRate: 12,
    category: "Textile - Coated",
  },
  {
    code: "5903",
    description:
      "Textile fabrics impregnated, coated, covered or laminated with plastics",
    type: "goods",
    gstRate: 12,
    category: "Textile - Technical",
  },
  // GARMENTS
  {
    code: "6101",
    description: "Mens or boys overcoats, car-coats, capes, anoraks (knitted)",
    type: "goods",
    gstRate: 12,
    category: "Garments - Outerwear",
  },
  {
    code: "6103",
    description:
      "Mens or boys suits, ensembles, jackets, blazers, trousers (knitted)",
    type: "goods",
    gstRate: 5,
    category: "Garments - Mens",
  },
  {
    code: "6104",
    description: "Womens or girls suits, ensembles, jackets, dresses (knitted)",
    type: "goods",
    gstRate: 5,
    category: "Garments - Womens",
  },
  {
    code: "6105",
    description: "Mens or boys shirts, knitted or crocheted",
    type: "goods",
    gstRate: 5,
    category: "Garments - Shirts",
  },
  {
    code: "6107",
    description:
      "Mens or boys underpants, briefs, nightshirts, pyjamas (knitted)",
    type: "goods",
    gstRate: 5,
    category: "Garments - Innerwear",
  },
  {
    code: "6109",
    description: "T-shirts, singlets and other vests, knitted or crocheted",
    type: "goods",
    gstRate: 5,
    category: "Garments - T-Shirts",
  },
  {
    code: "6110",
    description: "Jerseys, pullovers, sweatshirts, waistcoats (knitted)",
    type: "goods",
    gstRate: 12,
    category: "Garments - Knitwear",
  },
  {
    code: "6111",
    description:
      "Babies garments and clothing accessories, knitted or crocheted",
    type: "goods",
    gstRate: 5,
    category: "Garments - Kids",
  },
  {
    code: "6112",
    description: "Track suits, ski suits and swimwear (knitted)",
    type: "goods",
    gstRate: 12,
    category: "Garments - Sportswear",
  },
  {
    code: "6114",
    description: "Other garments, knitted or crocheted",
    type: "goods",
    gstRate: 5,
    category: "Garments",
  },
  {
    code: "6115",
    description: "Panty hose, tights, stockings, socks and other hosiery",
    type: "goods",
    gstRate: 12,
    category: "Garments - Hosiery",
  },
  {
    code: "6201",
    description: "Mens or boys overcoats, raincoats, car-coats, capes (woven)",
    type: "goods",
    gstRate: 12,
    category: "Garments - Outerwear",
  },
  {
    code: "6203",
    description:
      "Mens or boys suits, ensembles, jackets, blazers, trousers (woven)",
    type: "goods",
    gstRate: 5,
    category: "Garments - Mens",
  },
  {
    code: "6204",
    description: "Womens or girls suits, ensembles, jackets, dresses (woven)",
    type: "goods",
    gstRate: 5,
    category: "Garments - Womens",
  },
  {
    code: "6205",
    description: "Mens or boys shirts (woven, not knitted)",
    type: "goods",
    gstRate: 5,
    category: "Garments - Shirts",
  },
  {
    code: "6206",
    description: "Womens or girls blouses, shirts and shirt-blouses (woven)",
    type: "goods",
    gstRate: 5,
    category: "Garments - Womens",
  },
  {
    code: "6209",
    description: "Babies garments and clothing accessories (woven)",
    type: "goods",
    gstRate: 5,
    category: "Garments - Kids",
  },
  {
    code: "6211",
    description: "Track suits, ski suits and swimwear; other garments (woven)",
    type: "goods",
    gstRate: 12,
    category: "Garments - Sportswear",
  },
  {
    code: "6212",
    description: "Brassieres, girdles, corsets, braces, suspenders (woven)",
    type: "goods",
    gstRate: 12,
    category: "Garments - Innerwear",
  },
  {
    code: "6214",
    description: "Shawls, scarves, mufflers, mantillas, veils and the like",
    type: "goods",
    gstRate: 5,
    category: "Garments - Accessories",
  },
  {
    code: "6217",
    description: "Other made up clothing accessories; parts of garments",
    type: "goods",
    gstRate: 12,
    category: "Garments - Accessories",
  },
  // HOME TEXTILES
  {
    code: "6301",
    description: "Blankets and travelling rugs",
    type: "goods",
    gstRate: 12,
    category: "Home Textiles",
  },
  {
    code: "6302",
    description: "Bed linen, table linen, toilet linen and kitchen linen",
    type: "goods",
    gstRate: 5,
    category: "Home Textiles",
  },
  {
    code: "6303",
    description:
      "Curtains (including drapes) and interior blinds; curtain or bed valances",
    type: "goods",
    gstRate: 5,
    category: "Home Textiles",
  },
  {
    code: "6304",
    description: "Other furnishing articles, excluding those of heading 9404",
    type: "goods",
    gstRate: 12,
    category: "Home Textiles",
  },
  {
    code: "6305",
    description: "Sacks and bags of a kind used for packing of goods",
    type: "goods",
    gstRate: 5,
    category: "Packaging - Textile",
  },
  {
    code: "6306",
    description:
      "Tarpaulins, awnings and sunblinds; tents; sails; camping goods",
    type: "goods",
    gstRate: 12,
    category: "Industrial Textiles",
  },
  {
    code: "6307",
    description: "Other made up textile articles, including dress patterns",
    type: "goods",
    gstRate: 12,
    category: "Textile - Made-ups",
  },
  // FOOTWEAR
  {
    code: "6401",
    description:
      "Waterproof footwear with outer soles and uppers of rubber or plastics",
    type: "goods",
    gstRate: 18,
    category: "Footwear",
  },
  {
    code: "6402",
    description:
      "Other footwear with outer soles and uppers of rubber or plastics",
    type: "goods",
    gstRate: 18,
    category: "Footwear",
  },
  {
    code: "6403",
    description:
      "Footwear with outer soles of rubber, plastics, leather; uppers of leather",
    type: "goods",
    gstRate: 18,
    category: "Footwear",
  },
  {
    code: "6404",
    description:
      "Footwear with outer soles of rubber/plastics and uppers of textile",
    type: "goods",
    gstRate: 18,
    category: "Footwear",
  },
  // JEWELLERY
  {
    code: "7101",
    description: "Pearls, natural or cultured, whether or not worked or graded",
    type: "goods",
    gstRate: 0,
    category: "Jewellery - Pearls",
  },
  {
    code: "7102",
    description: "Diamonds, whether or not worked, not mounted or set",
    type: "goods",
    gstRate: 0.25,
    category: "Jewellery - Diamonds",
  },
  {
    code: "7103",
    description:
      "Precious stones (other than diamonds) and semi-precious stones",
    type: "goods",
    gstRate: 0.25,
    category: "Jewellery - Gemstones",
  },
  {
    code: "7104",
    description: "Synthetic or reconstructed precious or semi-precious stones",
    type: "goods",
    gstRate: 0.25,
    category: "Jewellery - Synthetic Stones",
  },
  {
    code: "7106",
    description:
      "Silver (including silver plated with gold or platinum), unwrought or semi-manufactured",
    type: "goods",
    gstRate: 3,
    category: "Jewellery - Silver",
  },
  {
    code: "7108",
    description:
      "Gold (including gold plated with platinum), unwrought or semi-manufactured forms",
    type: "goods",
    gstRate: 3,
    category: "Jewellery - Gold",
  },
  {
    code: "7110",
    description:
      "Platinum, unwrought or in semi-manufactured forms, or in powder form",
    type: "goods",
    gstRate: 3,
    category: "Jewellery - Platinum",
  },
  {
    code: "7112",
    description:
      "Waste and scrap of precious metal or of metal clad with precious metal",
    type: "goods",
    gstRate: 3,
    category: "Jewellery - Scrap",
  },
  {
    code: "7113",
    description:
      "Articles of jewellery and parts thereof, of precious metal or metal clad",
    type: "goods",
    gstRate: 3,
    category: "Jewellery - Articles",
  },
  {
    code: "7114",
    description:
      "Articles of goldsmiths or silversmiths wares of precious metal",
    type: "goods",
    gstRate: 3,
    category: "Jewellery - Articles",
  },
  {
    code: "7115",
    description:
      "Other articles of precious metal or of metal clad with precious metal",
    type: "goods",
    gstRate: 3,
    category: "Jewellery - Articles",
  },
  {
    code: "7116",
    description:
      "Articles of natural or cultured pearls, precious or semi-precious stones",
    type: "goods",
    gstRate: 3,
    category: "Jewellery - Articles",
  },
  {
    code: "7117",
    description: "Imitation jewellery",
    type: "goods",
    gstRate: 3,
    category: "Jewellery - Imitation",
  },
  {
    code: "7118",
    description: "Coin",
    type: "goods",
    gstRate: 3,
    category: "Jewellery - Coins",
  },
  // STEEL & METALS
  {
    code: "7208",
    description:
      "Flat-rolled products of iron or non-alloy steel, width >= 600mm, hot-rolled",
    type: "goods",
    gstRate: 18,
    category: "Steel",
  },
  {
    code: "7213",
    description:
      "Bars and rods, hot-rolled, in irregularly wound coils of iron or non-alloy steel",
    type: "goods",
    gstRate: 18,
    category: "Steel",
  },
  {
    code: "7214",
    description:
      "Other bars and rods of iron or non-alloy steel, not further worked",
    type: "goods",
    gstRate: 18,
    category: "Steel",
  },
  {
    code: "7217",
    description: "Wire of iron or non-alloy steel",
    type: "goods",
    gstRate: 18,
    category: "Steel",
  },
  {
    code: "7304",
    description: "Tubes, pipes and hollow profiles, seamless, of iron or steel",
    type: "goods",
    gstRate: 18,
    category: "Steel Products",
  },
  {
    code: "7308",
    description:
      "Structures of iron or steel (excluding prefabricated buildings)",
    type: "goods",
    gstRate: 18,
    category: "Steel - Structures",
  },
  {
    code: "7317",
    description:
      "Nails, tacks, drawing pins, corrugated nails, staples of iron or steel",
    type: "goods",
    gstRate: 18,
    category: "Hardware",
  },
  {
    code: "7318",
    description:
      "Screws, bolts, nuts, coach screws, screw hooks, rivets of iron or steel",
    type: "goods",
    gstRate: 18,
    category: "Hardware",
  },
  {
    code: "7323",
    description:
      "Table, kitchen or household articles and parts thereof of iron or steel",
    type: "goods",
    gstRate: 12,
    category: "Household - Metal",
  },
  // ALUMINIUM
  {
    code: "7601",
    description: "Unwrought aluminium",
    type: "goods",
    gstRate: 18,
    category: "Aluminium",
  },
  {
    code: "7606",
    description: "Aluminium plates, sheets and strip, thickness > 0.2 mm",
    type: "goods",
    gstRate: 18,
    category: "Aluminium",
  },
  // TOOLS & HARDWARE
  {
    code: "8201",
    description:
      "Hand tools: spades, shovels, mattocks, picks, hoes, forks and rakes",
    type: "goods",
    gstRate: 12,
    category: "Tools",
  },
  {
    code: "8203",
    description:
      "Files, rasps, pliers, pincers, tweezers, metal cutting shears, pipe cutters",
    type: "goods",
    gstRate: 12,
    category: "Tools",
  },
  {
    code: "8205",
    description: "Hand tools not elsewhere specified; blow lamps; vices",
    type: "goods",
    gstRate: 12,
    category: "Tools",
  },
  {
    code: "8211",
    description:
      "Knives with cutting blades, serrated or not (including pruning knives)",
    type: "goods",
    gstRate: 12,
    category: "Cutlery",
  },
  // MACHINERY & APPLIANCES
  {
    code: "8415",
    description:
      "Air conditioning machines with motor-driven fan and elements for changing temperature and humidity",
    type: "goods",
    gstRate: 28,
    category: "Appliances - AC",
  },
  {
    code: "8418",
    description:
      "Refrigerators, freezers and other refrigerating or freezing equipment",
    type: "goods",
    gstRate: 28,
    category: "Appliances - Refrigerator",
  },
  {
    code: "8422",
    description:
      "Dish washing machines; machinery for cleaning or drying bottles or other containers",
    type: "goods",
    gstRate: 28,
    category: "Appliances",
  },
  {
    code: "8450",
    description: "Household or laundry-type washing machines",
    type: "goods",
    gstRate: 28,
    category: "Appliances - Washing Machine",
  },
  {
    code: "8452",
    description:
      "Sewing machines, other than book-sewing machines of heading 8440",
    type: "goods",
    gstRate: 12,
    category: "Machinery - Sewing",
  },
  {
    code: "8471",
    description:
      "Automatic data processing machines (computers) and units thereof",
    type: "goods",
    gstRate: 18,
    category: "Electronics - Computers",
  },
  {
    code: "8481",
    description:
      "Taps, cocks, valves and similar appliances for pipes, tanks, vats",
    type: "goods",
    gstRate: 18,
    category: "Plumbing",
  },
  {
    code: "8504",
    description: "Electrical transformers, static converters, inductors",
    type: "goods",
    gstRate: 18,
    category: "Electrical - Transformers",
  },
  {
    code: "8507",
    description:
      "Electric accumulators (batteries), including separators therefor",
    type: "goods",
    gstRate: 18,
    category: "Electrical - Batteries",
  },
  {
    code: "8516",
    description:
      "Electric instantaneous or storage water heaters and immersion heaters",
    type: "goods",
    gstRate: 28,
    category: "Appliances - Water Heaters",
  },
  {
    code: "8517",
    description:
      "Telephone sets, including smartphones and wireless network phones",
    type: "goods",
    gstRate: 12,
    category: "Electronics - Phones",
  },
  {
    code: "8518",
    description:
      "Microphones and stands; loudspeakers; headphones; audio amplifiers",
    type: "goods",
    gstRate: 18,
    category: "Electronics - Audio",
  },
  {
    code: "8528",
    description: "Monitors and projectors; television reception apparatus",
    type: "goods",
    gstRate: 28,
    category: "Electronics - TV",
  },
  {
    code: "8536",
    description:
      "Electrical apparatus for switching or protecting electrical circuits",
    type: "goods",
    gstRate: 18,
    category: "Electrical - Switchgear",
  },
  {
    code: "8544",
    description:
      "Insulated wire, cable and other insulated electric conductors",
    type: "goods",
    gstRate: 18,
    category: "Electrical - Cables",
  },
  // VEHICLES
  {
    code: "8701",
    description: "Tractors (other than tractors of heading 8709)",
    type: "goods",
    gstRate: 12,
    category: "Vehicles - Agricultural",
  },
  {
    code: "8703",
    description:
      "Motor cars and other motor vehicles principally for transport of persons",
    type: "goods",
    gstRate: 28,
    category: "Vehicles - Cars",
  },
  {
    code: "8711",
    description:
      "Motorcycles (including mopeds) fitted with an auxiliary motor",
    type: "goods",
    gstRate: 28,
    category: "Vehicles - Two-Wheelers",
  },
  // MEDICAL & OPTICAL
  {
    code: "9004",
    description:
      "Spectacles, goggles and the like, corrective, protective or other",
    type: "goods",
    gstRate: 12,
    category: "Optical",
  },
  {
    code: "9018",
    description:
      "Instruments and appliances used in medical, surgical, dental or veterinary sciences",
    type: "goods",
    gstRate: 12,
    category: "Medical Devices",
  },
  {
    code: "9021",
    description:
      "Orthopaedic appliances, including crutches, surgical belts and trusses",
    type: "goods",
    gstRate: 5,
    category: "Medical Devices",
  },
  // FURNITURE & LIGHTING
  {
    code: "9401",
    description:
      "Seats (other than those of heading 9402), whether or not convertible into beds",
    type: "goods",
    gstRate: 18,
    category: "Furniture",
  },
  {
    code: "9403",
    description: "Other furniture and parts thereof",
    type: "goods",
    gstRate: 18,
    category: "Furniture",
  },
  {
    code: "9404",
    description:
      "Mattress supports; articles of bedding and similar furnishing",
    type: "goods",
    gstRate: 12,
    category: "Furniture - Bedding",
  },
  {
    code: "9405",
    description:
      "Lamps and lighting fittings including searchlights and spotlights",
    type: "goods",
    gstRate: 12,
    category: "Lighting",
  },
  // SPORTS, TOYS & MISC
  {
    code: "9503",
    description:
      "Tricycles, scooters, pedal cars and similar wheeled toys; dolls carriages",
    type: "goods",
    gstRate: 12,
    category: "Toys",
  },
  {
    code: "9506",
    description:
      "Articles and equipment for general physical exercise, gymnastics, athletics",
    type: "goods",
    gstRate: 12,
    category: "Sports Equipment",
  },
  {
    code: "9606",
    description:
      "Buttons, press-fasteners, snap-fasteners; button moulds and other parts of buttons",
    type: "goods",
    gstRate: 12,
    category: "Garment Accessories",
  },
  {
    code: "9607",
    description: "Slide fasteners and parts thereof",
    type: "goods",
    gstRate: 12,
    category: "Garment Accessories",
  },
  {
    code: "9608",
    description:
      "Ball point pens; felt tipped and other porous-tipped pens and markers",
    type: "goods",
    gstRate: 12,
    category: "Stationery",
  },
  {
    code: "9609",
    description: "Pencils, crayons, pencil leads, pastels, drawing charcoals",
    type: "goods",
    gstRate: 12,
    category: "Stationery",
  },
  {
    code: "9617",
    description: "Vacuum flasks and other vacuum vessels, complete with cases",
    type: "goods",
    gstRate: 18,
    category: "Household",
  },
  // ─── SAC CODES — SERVICES ───────────────────────────────────────────
  {
    code: "9954",
    description:
      "Construction services of buildings — residential, commercial, industrial",
    type: "service",
    gstRate: 18,
    category: "Construction Services",
  },
  {
    code: "9961",
    description: "Services in wholesale trade",
    type: "service",
    gstRate: 18,
    category: "Trade Services",
  },
  {
    code: "9962",
    description: "Services in retail trade",
    type: "service",
    gstRate: 18,
    category: "Trade Services",
  },
  {
    code: "9963",
    description: "Accommodation, food and beverage services",
    type: "service",
    gstRate: 18,
    category: "Hospitality",
  },
  {
    code: "9964",
    description: "Passenger transport services",
    type: "service",
    gstRate: 5,
    category: "Transport",
  },
  {
    code: "9965",
    description: "Goods transport services",
    type: "service",
    gstRate: 5,
    category: "Transport",
  },
  {
    code: "9966",
    description:
      "Rental services of transport vehicles with or without operators",
    type: "service",
    gstRate: 18,
    category: "Transport - Rental",
  },
  {
    code: "9967",
    description:
      "Supporting services in transport — freight forwarding, loading, cargo inspection",
    type: "service",
    gstRate: 18,
    category: "Transport - Support",
  },
  {
    code: "9968",
    description: "Postal and courier services",
    type: "service",
    gstRate: 18,
    category: "Courier",
  },
  {
    code: "9971",
    description:
      "Financial and related services — banking, insurance, investment",
    type: "service",
    gstRate: 18,
    category: "Financial Services",
  },
  {
    code: "9972",
    description: "Real estate services",
    type: "service",
    gstRate: 18,
    category: "Real Estate",
  },
  {
    code: "9973",
    description: "Leasing or rental services with or without operator",
    type: "service",
    gstRate: 18,
    category: "Leasing",
  },
  {
    code: "9981",
    description: "Research and development services",
    type: "service",
    gstRate: 18,
    category: "Professional Services",
  },
  {
    code: "9982",
    description: "Legal and accounting services",
    type: "service",
    gstRate: 18,
    category: "Professional Services",
  },
  {
    code: "9983",
    description: "Professional, technical and business services",
    type: "service",
    gstRate: 18,
    category: "Professional Services",
  },
  {
    code: "9984",
    description: "Telecommunications services",
    type: "service",
    gstRate: 18,
    category: "Telecom",
  },
  {
    code: "9985",
    description: "Support services including packaging, printing, maintenance",
    type: "service",
    gstRate: 18,
    category: "Support Services",
  },
  {
    code: "9986",
    description:
      "Support services to agriculture, hunting, forestry, fishing, mining",
    type: "service",
    gstRate: 0,
    category: "Agriculture Support",
  },
  {
    code: "9987",
    description:
      "Maintenance, repair and installation services (except construction)",
    type: "service",
    gstRate: 18,
    category: "Repair Services",
  },
  {
    code: "9988",
    description:
      "Manufacturing services on physical inputs (goods) owned by others — Job work on textile yarn, fabric, garments, embroidery, zari, lace, etc.",
    type: "service",
    gstRate: 5,
    category: "Job Work - Textile & Embroidery",
  },
  {
    code: "9989",
    description:
      "Other manufacturing services; publishing, printing and reproduction services",
    type: "service",
    gstRate: 18,
    category: "Manufacturing Services",
  },
  {
    code: "9991",
    description: "Public administration and other government services",
    type: "service",
    gstRate: 0,
    category: "Government",
  },
  {
    code: "9992",
    description: "Education services",
    type: "service",
    gstRate: 0,
    category: "Education",
  },
  {
    code: "9993",
    description: "Human health and social care services",
    type: "service",
    gstRate: 0,
    category: "Healthcare",
  },
  {
    code: "9994",
    description: "Sewage and waste collection, treatment and disposal services",
    type: "service",
    gstRate: 18,
    category: "Environment",
  },
  {
    code: "9995",
    description: "Services of membership organizations",
    type: "service",
    gstRate: 18,
    category: "Membership",
  },
  {
    code: "9996",
    description: "Recreational, cultural and sporting services",
    type: "service",
    gstRate: 18,
    category: "Recreation",
  },
  {
    code: "9997",
    description: "Other services not elsewhere classified",
    type: "service",
    gstRate: 18,
    category: "Other",
  },
  {
    code: "9998",
    description: "Domestic services",
    type: "service",
    gstRate: 0,
    category: "Domestic",
  },
  // Specific 6-digit SAC codes
  {
    code: "997111",
    description: "Equity and debt instrument services — stock broking, trading",
    type: "service",
    gstRate: 18,
    category: "Financial - Capital Markets",
  },
  {
    code: "997211",
    description: "Renting of residential properties",
    type: "service",
    gstRate: 0,
    category: "Real Estate - Residential",
  },
  {
    code: "997212",
    description:
      "Renting of commercial properties — offices, shops, warehouses",
    type: "service",
    gstRate: 18,
    category: "Real Estate - Commercial",
  },
  {
    code: "997221",
    description: "Property management services",
    type: "service",
    gstRate: 18,
    category: "Real Estate - Management",
  },
  {
    code: "998211",
    description: "Legal advisory and representation services",
    type: "service",
    gstRate: 18,
    category: "Legal Services",
  },
  {
    code: "998221",
    description: "Accounting and bookkeeping services",
    type: "service",
    gstRate: 18,
    category: "Accounting",
  },
  {
    code: "998222",
    description: "Taxation services — GST filing, income tax",
    type: "service",
    gstRate: 18,
    category: "Tax Consulting",
  },
  {
    code: "998223",
    description: "Auditing services — statutory audit, internal audit",
    type: "service",
    gstRate: 18,
    category: "Audit",
  },
  {
    code: "998311",
    description: "Management consulting and management services",
    type: "service",
    gstRate: 18,
    category: "Consulting",
  },
  {
    code: "998313",
    description: "Public relations services",
    type: "service",
    gstRate: 18,
    category: "PR Services",
  },
  {
    code: "998411",
    description: "Personnel search, referral and placement services",
    type: "service",
    gstRate: 18,
    category: "HR Services",
  },
  {
    code: "998512",
    description: "Courier services — pick-up, delivery",
    type: "service",
    gstRate: 18,
    category: "Courier",
  },
  {
    code: "999211",
    description: "Pre-primary education services",
    type: "service",
    gstRate: 0,
    category: "Education",
  },
  {
    code: "999212",
    description: "Primary education services",
    type: "service",
    gstRate: 0,
    category: "Education",
  },
  {
    code: "999213",
    description: "Secondary education services",
    type: "service",
    gstRate: 0,
    category: "Education",
  },
  {
    code: "999214",
    description: "Higher education services",
    type: "service",
    gstRate: 0,
    category: "Education",
  },
  {
    code: "999215",
    description: "Technical and vocational education services",
    type: "service",
    gstRate: 0,
    category: "Education",
  },
];

async function seedHsn() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: "billflow" });
    console.log("\u2705 Connected to MongoDB");

    const deleted = await HsnMaster.deleteMany({
      businessId: null,
      isCustom: false,
    });
    console.log(
      `\uD83D\uDDD1  Cleared ${deleted.deletedCount} existing global codes`,
    );

    let inserted = 0,
      errors = 0;
    const BATCH_SIZE = 50;

    for (let i = 0; i < HSN_DATA.length; i += BATCH_SIZE) {
      const batch = HSN_DATA.slice(i, i + BATCH_SIZE).map((item) => ({
        ...item,
        businessId: null,
        isCustom: false,
        // pre('save') hook doesn't fire on insertMany — compute rates explicitly
        igstRate: item.gstRate,
        cgstRate: item.gstRate / 2,
        sgstRate: item.gstRate / 2,
        chapter:  item.code?.substring(0, 2) || '',
      }));
      try {
        await HsnMaster.insertMany(batch, { ordered: false });
        inserted += batch.length;
      } catch (err) {
        if (err.code === 11000) {
          inserted += err.insertedDocs?.length || 0;
          errors += batch.length - (err.insertedDocs?.length || 0);
        } else {
          errors += batch.length;
        }
      }
      process.stdout.write(
        `\r\u23f3 Progress: ${Math.min(i + BATCH_SIZE, HSN_DATA.length)}/${HSN_DATA.length}`,
      );
    }

    console.log(`\n\n\u2705 HSN/SAC Seed Complete`);
    console.log(`   \uD83D\uDCE6 Total codes: ${HSN_DATA.length}`);
    console.log(`   \u2713  Inserted: ${inserted}`);
    if (errors) console.log(`   \u26A0  Skipped (duplicates): ${errors}`);

    const goods = HSN_DATA.filter((h) => h.type === "goods").length;
    const services = HSN_DATA.filter((h) => h.type === "service").length;
    console.log(`\n   \u2022 Goods (HSN):    ${goods}`);
    console.log(`   \u2022 Services (SAC): ${services}`);
  } catch (err) {
    console.error("\u274C Seed failed:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedHsn();
