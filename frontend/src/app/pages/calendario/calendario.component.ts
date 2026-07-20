import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EventoService, Evento, TIPOS_EVENTO } from '../../services/evento.service';
import { AuthService } from '../../services/auth.service';
import { Role } from '../../models/user.model';

interface Celda {
  dia: number | null;
  fecha: string;
  esHoy: boolean;
  eventos: Evento[];
}

// CA-022 · Calendario Académico (vista mensual)
@Component({
  selector: 'app-calendario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.scss']
})
export class CalendarioComponent implements OnInit {
  private eventoService = inject(EventoService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  readonly DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  readonly MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  readonly TIPOS = TIPOS_EVENTO;

  eventos = signal<Evento[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);
  mostrarForm = signal(false);

  anio = signal(new Date().getFullYear());
  mes = signal(new Date().getMonth()); // 0-11

  puedeGestionar = (): boolean => {
    const rol = this.authService.getUserRole();
    return rol === Role.ADMIN || rol === Role.DOCENTE;
  };

  form = this.fb.group({
    titulo: ['', Validators.required],
    descripcion: [''],
    fechaInicio: ['', Validators.required],
    tipo: ['CLASE', Validators.required],
  });

  tituloMes = computed(() => `${this.MESES[this.mes()]} ${this.anio()}`);

  /** Construye la grilla del mes (6 semanas × 7 días) con sus eventos. */
  celdas = computed<Celda[]>(() => {
    const y = this.anio(), m = this.mes();
    const primerDia = new Date(y, m, 1).getDay();
    const diasEnMes = new Date(y, m + 1, 0).getDate();
    const hoy = new Date();
    const salida: Celda[] = [];

    for (let i = 0; i < primerDia; i++) salida.push({ dia: null, fecha: '', esHoy: false, eventos: [] });

    for (let d = 1; d <= diasEnMes; d++) {
      const fecha = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      salida.push({
        dia: d,
        fecha,
        esHoy: hoy.getFullYear() === y && hoy.getMonth() === m && hoy.getDate() === d,
        eventos: this.eventos().filter(e => (e.fechaInicio || '').slice(0, 10) === fecha),
      });
    }
    return salida;
  });

  ngOnInit() { this.cargar(); }

  cargar() {
    this.cargando.set(true);
    this.error.set(null);
    this.eventoService.listar().subscribe({
      next: d => { this.eventos.set(d); this.cargando.set(false); },
      error: err => { this.error.set(err.message); this.cargando.set(false); }
    });
  }

  mesAnterior() {
    if (this.mes() === 0) { this.mes.set(11); this.anio.set(this.anio() - 1); }
    else this.mes.set(this.mes() - 1);
  }
  mesSiguiente() {
    if (this.mes() === 11) { this.mes.set(0); this.anio.set(this.anio() + 1); }
    else this.mes.set(this.mes() + 1);
  }
  hoy() {
    const d = new Date();
    this.anio.set(d.getFullYear());
    this.mes.set(d.getMonth());
  }

  colorTipo(tipo: string): string {
    const mapa: Record<string, string> = {
      CLASE: '#2563eb', EXAMEN: '#dc2626', TALLER: '#7c3aed',
      ENTREGA: '#f59e0b', FERIADO: '#16a34a', OTRO: '#64748b',
    };
    return mapa[tipo] || '#64748b';
  }

  nuevo() {
    this.form.reset({ titulo: '', descripcion: '', fechaInicio: '', tipo: 'CLASE' });
    this.mostrarForm.set(true);
  }

  guardar() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.value;
    this.eventoService.crear({
      titulo: v.titulo!,
      descripcion: v.descripcion || undefined,
      fechaInicio: new Date(v.fechaInicio!).toISOString(),
      tipo: v.tipo!,
      color: this.colorTipo(v.tipo!),
    }).subscribe({
      next: () => { this.mostrarForm.set(false); this.cargar(); },
      error: err => this.error.set(err.message)
    });
  }

  eliminar(e: Evento) {
    if (!confirm(`¿Eliminar el evento "${e.titulo}"?`)) return;
    this.eventoService.eliminar(e.id).subscribe({
      next: () => this.cargar(),
      error: err => this.error.set(err.message)
    });
  }

  proximos(): Evento[] {
    const ahora = new Date().toISOString();
    return this.eventos().filter(e => e.fechaInicio >= ahora).slice(0, 5);
  }
}
