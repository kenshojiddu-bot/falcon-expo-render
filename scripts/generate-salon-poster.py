from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageEnhance, ImageFont
from qrcode.constants import ERROR_CORRECT_Q


ROOT = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT = 1080, 1920
REGISTRATION_URL = "https://falcon-expo.onrender.com/salon.html"
SOURCE_IMAGE = ROOT / "public/falcon-expo-assets/hero-falcon.jpg"
QR_OUTPUT = ROOT / "public/falcon-expo-assets/salon-registration-qr.png"
POSTER_OUTPUT = ROOT / "public/falcon-expo-assets/oriental-falcon-salon-poster.png"
FONT_PATH = "/System/Library/Fonts/PingFang.ttc"

CHARCOAL = (23, 22, 21)
COPPER = (226, 181, 116)
VERMILION = (183, 58, 47)
WHITE = (255, 253, 250)
MUTED_WHITE = (228, 222, 214)


def font(size, index=0):
    return ImageFont.truetype(FONT_PATH, size=size, index=index)


def wrap_text(draw, text, text_font, max_width):
    lines = []
    current = ""
    for character in text:
        candidate = current + character
        width = draw.textbbox((0, 0), candidate, font=text_font)[2]
        if current and width > max_width:
            lines.append(current)
            current = character
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def draw_wrapped(draw, position, text, text_font, fill, max_width, line_gap):
    x, y = position
    line_height = draw.textbbox((0, 0), "国A", font=text_font)[3]
    for line in wrap_text(draw, text, text_font, max_width):
        draw.text((x, y), line, font=text_font, fill=fill)
        y += line_height + line_gap
    return y


def cover_crop(image, target_size, focus_x=0.64, focus_y=0.75, zoom=1.25):
    target_width, target_height = target_size
    scale = max(target_width / image.width, target_height / image.height) * zoom
    resized = image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )
    max_left = max(0, resized.width - target_width)
    left = round(max_left * focus_x)
    max_top = max(0, resized.height - target_height)
    top = round(max_top * focus_y)
    return resized.crop((left, top, left + target_width, top + target_height))


def make_qr():
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_Q,
        box_size=10,
        border=4,
    )
    qr.add_data(REGISTRATION_URL)
    qr.make(fit=True)
    image = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    QR_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(QR_OUTPUT, format="PNG", optimize=True)
    return image


def make_poster(qr_image):
    source = Image.open(SOURCE_IMAGE).convert("RGB")
    background = cover_crop(source, (WIDTH, HEIGHT))
    background = ImageEnhance.Color(background).enhance(0.78)
    background = ImageEnhance.Brightness(background).enhance(0.58)

    poster = background.convert("RGBA")
    poster.alpha_composite(Image.new("RGBA", poster.size, (12, 11, 10, 74)))
    draw = ImageDraw.Draw(poster, "RGBA")

    margin = 64
    draw.text((margin, 76), "高端商务沙龙  ·  成都", font=font(30), fill=COPPER)
    draw.text((margin, 148), "精品东方", font=font(96), fill=WHITE)
    draw.text((margin, 258), "鹰耀出海", font=font(96), fill=WHITE)
    draw.rectangle((margin, 398, 260, 404), fill=COPPER)

    intro_top = 456
    draw.rounded_rectangle(
        (margin, intro_top, WIDTH - margin, 872),
        radius=8,
        fill=(20, 19, 18, 218),
        outline=(226, 181, 116, 96),
        width=2,
    )
    draw.rectangle((margin, intro_top, margin + 8, 872), fill=COPPER)
    draw.text((margin + 34, intro_top + 30), "活动主题", font=font(30), fill=COPPER)
    overview = (
        "活动以“精品东方·鹰耀出海”为主题，围绕沙特猎鹰展推介、"
        "AI+文旅出海与东方精品文化交流展开，链接出海企业家、海外嘉宾、"
        "AI科技企业代表及高净值客户。"
    )
    intro_end = draw_wrapped(
        draw,
        (margin + 34, intro_top + 88),
        overview,
        font(35),
        WHITE,
        WIDTH - 2 * margin - 76,
        15,
    )
    draw.rounded_rectangle(
        (margin + 34, intro_end + 10, margin + 382, intro_end + 62),
        radius=8,
        fill=(183, 58, 47, 230),
    )
    draw.text(
        (margin + 54, intro_end + 18),
        "沙特猎鹰展推介",
        font=font(27),
        fill=WHITE,
    )

    info_top = 918
    draw.text((margin, info_top), "2026年8月7日", font=font(50), fill=COPPER)
    draw.text(
        (margin, info_top + 76),
        "15:00 主题活动   |   18:00 精品晚宴",
        font=font(33),
        fill=WHITE,
    )
    draw.text((margin, info_top + 142), "成都高新区豪生酒店", font=font(39), fill=WHITE)
    draw.text(
        (margin, info_top + 202),
        "成都市武侯区天泰路338号",
        font=font(29),
        fill=MUTED_WHITE,
    )

    panel = (margin, 1246, WIDTH - margin, 1856)
    draw.rounded_rectangle(panel, radius=8, fill=WHITE)
    qr_size = 440
    qr_for_poster = qr_image.resize((qr_size, qr_size), Image.Resampling.NEAREST)
    poster.alpha_composite(qr_for_poster.convert("RGBA"), (94, 1322))

    right_x = 584
    draw.text((right_x, 1362), "扫码报名", font=font(58), fill=CHARCOAL)
    draw.rectangle((right_x, 1448, right_x + 150, 1454), fill=VERMILION)
    draw.text((right_x, 1494), "席位有限", font=font(34), fill=CHARCOAL)
    draw.text((right_x, 1546), "提交后联系确认", font=font(28), fill=(78, 71, 64))
    draw.text(
        (right_x, 1650),
        "falcon-expo.onrender.com/salon.html",
        font=font(18),
        fill=(78, 71, 64),
    )
    draw.text((94, 1788), "扫码进入正式报名页面", font=font(27), fill=(78, 71, 64))

    poster.convert("RGB").save(POSTER_OUTPUT, format="PNG", optimize=True)


if __name__ == "__main__":
    qr_image = make_qr()
    make_poster(qr_image)
    print(QR_OUTPUT)
    print(POSTER_OUTPUT)
