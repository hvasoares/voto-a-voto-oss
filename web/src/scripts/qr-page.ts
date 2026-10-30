import { SHARD_VERSION } from 'virtual:data-shards'
import { bootPageData } from '@/lib/page-data-boot'
import { drawQrScreen, type QrScreenRecord } from '@/lib/qr-screen'

/** The city QR page (private#208): the stub loads `data/v<fingerprint>/qr/<uf>/<slug>.json` and draws the screen from it. */
void bootPageData<QrScreenRecord>({ family: 'qr', version: SHARD_VERSION, draw: drawQrScreen })
